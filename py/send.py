import csv
import time
import threading
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

LOG_FILE = 'email_logs.txt'
SENT_EMAILS_COUNT = 0
TOTAL_EMAILS_COUNT = 0
LOCK = threading.Lock()

def send_email(smtp_info, to, from_email, subject, html_content):
    try:
        msg = MIMEMultipart()
        msg['From'] = f"{from_email} <{smtp_info['email']}>"
        msg['To'] = to
        msg['Subject'] = subject
        msg.attach(MIMEText(html_content, 'html'))

        server = smtplib.SMTP(smtp_info['smtp'], 587)
        server.starttls()
        server.login(smtp_info['email'], smtp_info['password'])
        server.send_message(msg)
        server.quit()
        return True
    except Exception as e:
        print(f"Failed to send email: {e}")
        return False

def read_csv(file_path):
    items = []
    with open(file_path, 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            items.append(row)
    return items

def send_emails():
    global TOTAL_EMAILS_COUNT
    smtp_info_list = read_csv('../files/working_smtp.csv')
    data = read_csv('../files/data.csv')
    TOTAL_EMAILS_COUNT = len(data)
    info = read_csv('../files/info.csv')
    with open('../files/html.txt', 'r') as file:
        html_content = file.read().strip()
    subject = info[0]['subject']
    from_ = info[0]['from']
    print(f"data length : {len(data)}")

    threads = []
    for smtp_info in smtp_info_list:
        thread = threading.Thread(target=worker_task, args=(smtp_info, data[:], html_content, subject, from_))
        threads.append(thread)
        thread.start()

    for thread in threads:
        thread.join()

    print('All emails sent successfully.')

def worker_task(smtp_info, data, html_content, subject, from_):
    global SENT_EMAILS_COUNT
    emails_per_user = 50  # Number of emails each SMTP user sends
    while data:
        if SENT_EMAILS_COUNT >= TOTAL_EMAILS_COUNT:
            break
        index = 0
        while data and index < emails_per_user:
            if SENT_EMAILS_COUNT >= TOTAL_EMAILS_COUNT:
                break
            email_data = data.pop(0)
            if send_email(smtp_info, email_data['to'], from_, subject, html_content):
                with LOCK:
                    SENT_EMAILS_COUNT += 1
                    print(f"User: {smtp_info['email']}, To: {email_data['to']}, Message sent ({SENT_EMAILS_COUNT}/{TOTAL_EMAILS_COUNT})")
            time.sleep(1)  # Adjust the interval as needed
            index += 1

    with open(LOG_FILE, 'a') as log_file:
        log_file.write('Done\n')

if __name__ == "__main__":
    send_emails()
