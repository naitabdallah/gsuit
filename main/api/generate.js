const fs = require('fs');

// Function to generate random string of given length
function generateRandomString(length) {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let randomString = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * charset.length);
        randomString += charset[randomIndex];
    }
    return randomString;
}

// Function to generate a random email address with a specific domain
function generateRandomEmail(givenName, familyName, domain) {
    const username = `${givenName.toLowerCase()}.${familyName.toLowerCase()}`;
    return `${username}@${domain}`;
}

// Function to generate a random CSV-like data from given names and surnames
function generateRandomCSVFromNames(givenNames, surnames, domain, numRecords) {
    let csv = 'email,password,givenName,familyName\n';
    const fixedPassword = 'Password123@';
    const generatedEmails = new Set(); // Set to store generated emails
    let generatedCount = 0;

    while (generatedCount < numRecords) {
        const givenNameIndex = Math.floor(Math.random() * givenNames.length);
        const familyNameIndex = Math.floor(Math.random() * surnames.length);
        const givenName = givenNames[givenNameIndex];
        const familyName = surnames[familyNameIndex];
        const email = generateRandomEmail(givenName, familyName, domain);

        // Check if the email is not a duplicate
        if (!generatedEmails.has(email)) {
            const password = fixedPassword; // Fixed password
            csv += `${email},${password},${givenName},${familyName}\n`;
            generatedEmails.add(email);
            generatedCount++;
        }
    }

    return csv;
}

function generateAndWriteCSV(numRecords, domain, fileName) {
    // Read the CSV file containing given names and surnames
    fs.readFile('../../files/names.csv', 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading names file:', err);
            return;
        }
        // Split the data into lines and extract given names and surnames
        const lines = data.trim().split('\n');
        const givenNames = [];
        const surnames = [];
        for (const line of lines) {
            const [givenName, surname] = line.split(',');
            givenNames.push(givenName.trim());
            surnames.push(surname.trim());
        }
        // Generate CSV using extracted names
        const csvContent = generateRandomCSVFromNames(givenNames, surnames, domain, numRecords);
        // Write CSV content to file
        fs.writeFileSync(fileName, csvContent);
        console.log(`CSV file generated: ${fileName}`);
    });
}

// Example usage: Generate CSV with input parameters
const args = process.argv.slice(2);
if (args.length !== 2) {
    console.error('Please provide the domain and the number of records as arguments.');
    console.error('Usage: node script.js <domain> <numRecords>');
    process.exit(1);
}

const domain = args[0];
const numRecords = parseInt(args[1], 10);
const fileName = '../../files/user_list.csv';

if (isNaN(numRecords) || numRecords <= 0) {
    console.error('The number of records must be a positive integer.');
    process.exit(1);
}

generateAndWriteCSV(numRecords, domain, fileName);
