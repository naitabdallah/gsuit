import csv

def extract_unique_emails(file1,output_file):
    # Read email addresses from the first CSV file into a set
    with open(file1, 'r') as f1:
        reader1 = csv.reader(f1)
        emails_set1 = set(row[0] for row in reader1)

    print(f"first : {len(emails_set1)}")


    # Write unique emails to a new CSV file
    with open(output_file, 'w', newline='') as f_out:
        writer = csv.writer(f_out)
        writer.writerow(['Unique Emails'])
        for email in emails_set1:
            writer.writerow([email])

# Paths to the CSV files and output file
file1 = "../files/users.csv"
output_file = 'unique_data.csv'

extract_unique_emails(file1, output_file)
