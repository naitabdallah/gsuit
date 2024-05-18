import csv
import time
import logging
import chromedriver_autoinstaller
from multiprocessing import Pool
from selenium.webdriver import Chrome
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.chrome.options as Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.support import expected_conditions as EC

logging.basicConfig(filename='logfile.log', level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Function to read email and password data from file
def read_credentials_from_csv(file_path):
    credentials = []
    with open(file_path, 'r') as file:
        reader = csv.DictReader(file)
        for row in reader:
            email = row['email']
            password = row['password']
            credentials.append((email, password))
    return credentials

# Function to process each user's login and store the data
def process_user(email, password):
    try:
        # Configure Chrome options for headless mode
        chrome_options = Options()
        chrome_options.add_argument("--headless")  # Make Chrome headless

        # Create a new Chrome session with headless 
        driver = Chrome(options=chrome_options)

        # Open the Google sign-in page
        driver.get("https://accounts.google.com/v3/signin/identifier?continue=https%3A%2F%2Fmyaccount.google.com%2Fintro%2Fsecurity&hl=fr&ifkv=ARZ0qKLj2xpHzfU2IFFY1KovO_7NePKCzW6gl20FnaxJTHMnlR9Io-28rbvGSSdwJWj8NFRgeQD72w&service=accountsettings&flowName=GlifWebSignIn&flowEntry=ServiceLogin&dsh=S1561141488%3A1713031444813653&theme=mn&ddm=0")

        # Find and fill in the email field
        email_field = WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.ID, "identifierId")))
        email_field.send_keys(email)
        email_field.send_keys(Keys.RETURN)

        # Find and fill in the password field
        password_field = WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.NAME, "Passwd")))
        password_field.send_keys(password)
        password_field.send_keys(Keys.RETURN)

        try:
            # Check if the confirm button exists
            confirm_button =  WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.ID, "confirm")))
            # Click the confirm button
            confirm_button.click()
            print("Confirm button clicked successfully.")
        except:
            pass
        
        time.sleep(10)
        
        # Navigate to the less secure apps settings page
        driver.get("https://myaccount.google.com/lesssecureapps")

        # Click the specified button
        button = WebDriverWait(driver, 20).until(EC.element_to_be_clickable((By.CSS_SELECTOR, "#yDmH0d > c-wiz > div > div:nth-child(2) > div:nth-child(2) > c-wiz > div > div.VfPpkd-WsjYwc.VfPpkd-WsjYwc-OWXEXe-INsAgc.KC1dQ.Usd1Ac.AaN0Dd.F2KCCe.Z2xVec.E2bpG.injfOc > div > div > ul > li > div > div.kvjuQc.biRLo > div > button")))
        button.click()

        time.sleep(5)  # Wait for the operation to complete

        # SMTP server and port
        smtp_server = "smtp.gmail.com"
        smtp_port = 587

        # Write data to CSV
        with open("../files/processed_users.csv", mode='a', newline='') as file:
            writer = csv.writer(file)
            writer.writerow([smtp_server, smtp_port, email, password, email])

        driver.quit()
        logging.info(f"{email} processed with success")

    except TimeoutException as te:
        with open("../files/unprocessed_users.csv", mode='a', newline='') as file:
            writer = csv.writer(file)
            writer.writerow([email, password])
        logging.error(f"A timeout occurred for {email}: {te.msg}")
    except Exception as e:
        with open("../files/unprocessed_users.csv", mode='a', newline='') as file:
            writer = csv.writer(file)
            writer.writerow([email, password])
        logging.error(f"An error occurred for {email}: {e}")
        logging.error(f"Type of exception: {type(e)}")
        logging.error(f"Error message: {str(e)}")
        print(f"An error occurred for {email}.")
        
def retry_unprocessed_users(max_retries=5):
    retries = 0
    while retries < max_retries:
        retries += 1
        print(f"Retrying unprocessed users, attempt {retries}/{max_retries}...")
        
        unprocessed_users = read_credentials_from_csv("../files/unprocessed_users.csv")
        if not unprocessed_users:
            print("No more unprocessed users to retry.")
            break
        
        # Clear the unprocessed users file
        with open("../files/unprocessed_users.csv", 'w') as file:
            file.write("email,password\n")

        # Create a pool of processes
        with Pool(processes=num_processes) as pool:
            # Map the process function to each set of credentials
            pool.starmap(process_user, unprocessed_users)
    
    print("All retry attempts completed.")

if __name__ == "__main__":
    # Your Gmail email and password file path
    file_path = "../files/users.csv"
    
    chromedriver_autoinstaller.install()

    # Read email and password data from file
    credentials = read_credentials_from_csv(file_path)

    # Number of concurrent processes (browsers to open)
    num_processes = 20
    
    # Create a pool of processes
    with Pool(processes=num_processes) as pool:
        # Map the process function to each set of credentials
        pool.starmap(process_user, credentials)

    # Retry unprocessed users up to max_retries times
    retry_unprocessed_users(max_retries=5)

    print("Processing completed. Data stored in processed_users.csv")

    input("Press Enter to close the browser...")
