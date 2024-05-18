const fs = require('fs');
const csv = require('csv-parser');
const { google } = require('googleapis');
const privateKey = require('./cred.json');

// Function to list messages matching a specific query
function listMessages(query, jwtClient, callback) {
    const gmail = google.gmail({ version: 'v1', auth: jwtClient });
    gmail.users.messages.list({
        userId: 'me',
        q: query
    }, (error, res) => {
        if (error) {
            console.error('Error listing messages:', error);
            callback([]);
        } else {
            callback(res.data.messages || []);
        }
    });
}

// Function to get a single message by ID and extract email address from snippet
function getMessage(messageId, jwtClient, callback) {
    const gmail = google.gmail({ version: 'v1', auth: jwtClient });
    gmail.users.messages.get({
        userId: 'me',
        id: messageId,
    }, (error, res) => {
        if (error) {
            console.error('Error getting message:', error);
            callback(null);
        } else {
            // Extracting email address from the snippet
            const snippet = res.data.snippet;
            if (snippet.includes("Message blocked") || snippet.includes("Message not delivered")) {
                // If the snippet contains "Message blocked", return null
                callback(null);
            } else {
                // Extracting email address from the snippet
                const match = snippet.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
                if (match) {
                    callback(match[0]); // Pass only the email address to the callback
                } else {
                    callback(null); // If no email address found in the snippet
                }
            }
        }
    });
}


// Function to fetch messages from Mail Delivery Subsystem for a user
function getMessagesFromMailDeliverySubsystem(user, callback) {
    try {
        // Initialize Google JWT client
        const jwtClient = new google.auth.JWT(
            privateKey.client_email,
            null,
            privateKey.private_key,
            ['https://mail.google.com'],
            user // Specify the user's email address
        );
        // List messages matching the query
        listMessages('from:"Mail Delivery Subsystem"', jwtClient, (messages) => {
            // Retrieve and return email addresses
            const emails = [];
            let count = 0;
            for (const message of messages) {
                getMessage(message.id, jwtClient, (email) => {
                    if (email) {
                        emails.push(email);
                        // Save the bounced email immediately when found
                        saveBouncedEmail(email);
                    }
                    count++;
                    if (count === messages.length) {
                        callback(emails);
                    }
                });
            }
            if (messages.length === 0) {
                callback([]);
            }
        });
    } catch (error) {
        console.error('Error:', error);
        callback([]);
    }
}

// Function to save a single bounced email to a file
function saveBouncedEmail(email) {
    const csvString = `${email}\n`;
    fs.appendFileSync('bounced_emails.csv', csvString);
}

// Function to process each user
// Function to process each user
function processUsers(users) {
    for (let i = 0; i < users.length; i++) {
        const userEmail = users[i];
        console.log(`Processing user: ${userEmail}`);
        getMessagesFromMailDeliverySubsystem(userEmail, (emails) => {
            if (emails.length > 0) {
                console.log(`Found ${emails.length} messages for user: ${userEmail}`);
            } else {
                console.log(`No messages found for user: ${userEmail}`);
            }
        });
    }
}


// Function to process CSV file and find bounced emails
function processCSV(filePath) {
    const users = [];
    fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (row) => {
            users.push(row.email);
        })
        .on('end', () => {
            console.log(`Total ${users.length} users found.`);
            processUsers(users);
        });
}

// Example usage: Replace 'user_list.csv' with the path to your CSV file
processCSV('../../files/users.csv');
