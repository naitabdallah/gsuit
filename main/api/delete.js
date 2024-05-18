const { google } = require('googleapis');
const privateKey = require('./cred.json');

let usersToDelete = [];
let deletedUsersCount = 0;
let totalUsersCount = 0;
const adminEmail = "admin@decieodom.com";

// Function to delete users in Google Admin
const deleteUser = () => {
    const jwtClient = new google.auth.JWT(
        privateKey.client_email,
        null,
        privateKey.private_key,
        ['https://www.googleapis.com/auth/admin.directory.user'],
        adminEmail
    );

    jwtClient.authorize(function (err, tokens) {
        if (err) {
            console.error(err);
            return;
        }

        const admin = google.admin({
            version: 'directory_v1',
            auth: jwtClient
        });

        const deleteUsers = (pageToken) => {
            admin.users.list({
                customer: 'my_customer',
                auth: jwtClient,
                maxResults: 100,
                pageToken: pageToken
            }, (err, res) => {
                if (err) {
                    console.error('Error retrieving users:', err);
                    return;
                }
        
                const users = res.data.users;
                if (users) {
                    users.forEach((user) => {
                        const userEmailDomain = user.primaryEmail;
                        if (userEmailDomain !== adminEmail) {
                            usersToDelete.push(user.id);
                            totalUsersCount++;
                        }
                    });

                    if (res.data.nextPageToken) {
                        deleteUsers(res.data.nextPageToken);
                    } else {
                        processDeletions();
                    }
                } else {
                    console.log('No users found.');
                    process.exit(0);
                }
            });
        };

        const processDeletions = () => {
            if (usersToDelete.length === 0) {
                console.log('No users to delete.');
                process.exit(0);
            }

            const interval = setInterval(() => {
                if (usersToDelete.length === 0 && deletedUsersCount === totalUsersCount) {
                    console.log('All users deleted.');
                    clearInterval(interval);
                    process.exit(0);
                }

                for (let i = 0; i < Math.min(1, usersToDelete.length); i++) {
                    const userId = usersToDelete.shift();

                    admin.users.delete({
                        userKey: userId,
                        auth: jwtClient
                    }, (err, res) => {
                        if (err) {
                            console.error('Error deleting user:', err);
                            return;
                        }
                        deletedUsersCount++;
                        console.log('User deleted successfully:', userId);
                    });
                }
                console.log('Deleted users count:', deletedUsersCount);
            }, 250);
        };

        deleteUsers();
    });
};

deleteUser();
