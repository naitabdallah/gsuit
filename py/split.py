import csv
import os

# Function to extract domain from email address
def extract_domain(email):
    return email.split('@')[-1]

# Function to process CSV data and split into files based on domain
def split_csv(input_file):
    with open(input_file, 'r') as file:
        reader = csv.DictReader(file)
        rows = list(reader)

    # Create a dictionary to store rows based on domain
    domain_files = {}

    for row in rows:
        domain = extract_domain(row['email'])
        if domain not in domain_files:
            domain_files[domain] = []

        domain_files[domain].append(row)

    # Write each domain's data to a separate CSV file
    for domain, data in domain_files.items():
        output_file = f"{domain}.csv"
        with open(output_file, 'w', newline='') as file:
            fieldnames = ['smtp', 'port', 'email', 'password', 'fromEmail']
            writer = csv.DictWriter(file, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)

# Define input file path
input_file = 'working_smtp.csv'

# Check if input file exists
if not os.path.exists(input_file):
    print("Input file not found.")
else:
    split_csv(input_file)
    print("CSV file split successfully.")
