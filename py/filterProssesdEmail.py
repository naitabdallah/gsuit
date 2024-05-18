import csv

def extract_unique_emails(file1, file2, output_file):
    # Read email addresses from the first CSV file into a set
    with open(file1, 'r') as f1:
        reader1 = csv.reader(f1)
        emails_set1 = set(row[0] for row in reader1)

    # Read email addresses from the second CSV file into a set
    with open(file2, 'r') as f2:
        reader2 = csv.reader(f2)
        emails_set2 = set(row[0] for row in reader2)

    print(f"first : {len(emails_set1)}")
    print(f"second : {len(emails_set2)}")

    # Find the unique emails by subtracting the second set from the first set
    unique_emails = emails_set1 - emails_set2

    print(f"finale : {len(unique_emails)}")

    # Write unique emails to a new CSV file
    with open(output_file, 'w', newline='') as f_out:
        writer = csv.writer(f_out)
        writer.writerow(['Unique Emails'])
        for email in unique_emails:
            writer.writerow([email])

# Paths to the CSV files and output file
file1 ="../files/user_list.csv" 
file2 = "unique_data.csv"
output_file = 'users_not_used.csv'

extract_unique_emails(file1, file2, output_file)
