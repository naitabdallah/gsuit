import pandas as pd
import smtplib
from concurrent.futures import ThreadPoolExecutor

# Function to check SMTP connection
def check_smtp_connection(row):
    smtp_server = row['smtp']
    port = row['port']
    email = row['email']
    password = row['password']
    try:
        server = smtplib.SMTP(smtp_server, int(port))
        server.starttls()
        server.login(email, password)
        server.quit()
        return row, True
    except Exception as e:
        print(f"SMTP connection failed for {email}: {e}")
        return row, False

# Read the CSV file containing SMTP details
smtp_details_df = pd.read_csv("../files/processed_users.csv")

# Lists to store working and non-working SMTP details
working_smtp = []
non_working_smtp = []

# Concurrently check SMTP connections
with ThreadPoolExecutor(max_workers=1000) as executor:  # Adjust max_workers as needed
    futures = [executor.submit(check_smtp_connection, row) for index, row in smtp_details_df.iterrows()]
    for future in futures:
        row, is_working = future.result()
        if is_working:
            working_smtp.append(row)
        else:
            non_working_smtp.append(row)

# Create DataFrame for working SMTPs and non-working SMTPs
working_smtp_df = pd.DataFrame(working_smtp)
non_working_smtp_df = pd.DataFrame(non_working_smtp)

# Save the updated CSV files
working_smtp_df.to_csv("../files/working_smtp.csv", index=False)
non_working_smtp_df.to_csv("../files/non_working_smtp.csv", index=False)
