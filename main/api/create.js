const fs = require('fs');
const csv = require('csv-parser');
const { google } = require('googleapis');
const privateKey = require('./cred.json');

const admin_user = "admin@decieodom.com";

const jwtClient = new google.auth.JWT(
    privateKey.client_email,
    null,
    privateKey.private_key,
    ['https://www.googleapis.com/auth/admin.directory.user'],
    admin_user
);

function createUser(user, password, firstname, lastname, callback) {
    jwtClient.authorize(function (err, tokens) {
        if (err) {
            console.error(err);
            callback(err, null);
            return;
        }

        const admin = google.admin({
            version: 'directory_v1',
            auth: jwtClient
        });
        admin.users.insert({
            auth: jwtClient,
            resource: {
                primaryEmail: user,
                password: password,
                name: {
                    givenName: firstname,
                    familyName: lastname
                },
                changePasswordAtNextLogin: false
            }
        }, (err, res) => {
            if (err) {
                console.error('Error creating user:', err);
                callback(err, null);
            } else {
                callback(null, res.data);
            }
        });
    });
}

let queue = [];
let isProcessing = false;
let createdUsersCount = 0;

fs.createReadStream('../../files/user_list.csv')
    .pipe(csv())
    .on('data', (row) => {
        queue.push(row);
    })
    .on('end', () => {
        console.log('CSV file successfully processed. Starting user creation...');
        processQueue();
    });

function processQueue() {
    if (queue.length === 0) {
        isProcessing = false;
        console.log(`All users processed. Total users created: ${createdUsersCount}`);
        process.exit(0);
        return;
    }

    if (isProcessing) return;

    isProcessing = true;

    const row = queue.shift();
    const user = row.email;
    const password = row.password;
    const firstname = row.givenName;
    const lastname = row.familyName;

    createUser(user, password, firstname, lastname, (err, result) => {
        if (err) {
            console.error('Error creating user:', err.response);
        } else {
            createdUsersCount++;
            console.log(`Number of users created: ${createdUsersCount}`);
        }

        isProcessing = false;
        processQueue();
    });
}
