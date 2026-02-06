import imaplib
import email
import re
import requests
import time
import os
import logging
from email.header import decode_header

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Configuration from environment variables
IMAP_SERVER = os.getenv('IMAP_SERVER', 'imap.gmail.com')
EMAIL_USER = os.getenv('EMAIL_USER')
EMAIL_PASS = os.getenv('EMAIL_PASS')
BACKEND_URL = os.getenv('BACKEND_URL', 'http://app:8080/api/v1/admin/credit')
ADMIN_SECRET_KEY = os.getenv('ADMIN_SECRET_KEY')

def get_email_body(msg):
    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            content_disposition = str(part.get("Content-Disposition"))
            if content_type == "text/plain" and "attachment" not in content_disposition:
                return part.get_payload(decode=True).decode()
    else:
        return msg.get_payload(decode=True).decode()
    return ""

def extract_email(text):
    # Regex to find email addresses
    email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    matches = re.findall(email_pattern, text)
    if matches:
        # Return the first match that isn't the sender (noreply@selar.co)
        for match in matches:
            if "selar.co" not in match:
                return match
    return None

def extract_product_type(text):
    """
    Determines the product type based on keywords in the email body.
    Returns: 'sub', 'starter', 'bulk', or None
    """
    text_lower = text.lower()
    
    # Specific Plan Detection based on user examples
    if "starter top-up" in text_lower:
        return "starter"
    if "bulk top-up" in text_lower:
        return "bulk"
    if "mega top-up" in text_lower:
        return "mega_topup"

    # Subscription Plan Detection (Priority)
    # specific keys: "monthly recurring plan"
    if "monthly recurring plan" in text_lower:
        return "sub"

    # Fallback/Other Plans
    if "pro access" in text_lower:
         return "sub"
    elif "starter pack" in text_lower:
        return "starter"
    elif "bulk pack" in text_lower:
        return "bulk"
    
    return None

def process_emails():
    if not all([EMAIL_USER, EMAIL_PASS, ADMIN_SECRET_KEY]):
        logger.error("Missing required environment variables: EMAIL_USER, EMAIL_PASS, or ADMIN_SECRET_KEY")
        return

    try:
        # Connect to IMAP server
        mail = imaplib.IMAP4_SSL(IMAP_SERVER)
        mail.login(EMAIL_USER, EMAIL_PASS)
        mail.select("inbox")

        # Search for unread emails from noreply@selar.co with subject "New Sale"
        # Note: Some IMAP servers might require specific search syntax.
        # We'll search for UNSEEN and filter manually if needed, or try to be specific.
        # "FROM noreply@selar.co SUBJECT 'New Sale'"
        status, messages = mail.search(None, '(UNSEEN FROM "noreply@selar.co" SUBJECT "New Sale")')
        
        if status != "OK":
            logger.error("Failed to search emails")
            return

        email_ids = messages[0].split()
        
        if not email_ids:
            logger.info("No new sales emails found.")
            return

        logger.info(f"Found {len(email_ids)} new sales emails.")

        for e_id in email_ids:
            try:
                _, msg_data = mail.fetch(e_id, "(RFC822)")
                for response_part in msg_data:
                    if isinstance(response_part, tuple):
                        msg = email.message_from_bytes(response_part[1])
                        subject, encoding = decode_header(msg["Subject"])[0]
                        if isinstance(subject, bytes):
                            subject = subject.decode(encoding if encoding else "utf-8")
                        
                        logger.info(f"Processing email: {subject}")
                        
                        body = get_email_body(msg)
                        customer_email = extract_email(body)
                        
                        if customer_email:
                            logger.info(f"Extracted customer email: {customer_email}")
                            
                            # Determine product type
                            product_type = extract_product_type(body)
                            if not product_type:
                                logger.warning(f"Could not determine product type for email: {subject}")
                                continue
                                
                            logger.info(f"Detected product type: {product_type}")

                            # Call backend API
                            params = {
                                'key': ADMIN_SECRET_KEY,
                                'email': customer_email,
                                'action': product_type
                            }
                            
                            try:
                                response = requests.get(BACKEND_URL, params=params)
                                if response.status_code == 200:
                                    logger.info(f"Successfully credited user: {customer_email} with {product_type}")
                                    # Mark as read (already done by fetch, but good to know)
                                else:
                                    logger.error(f"Backend API failed for {customer_email}: {response.status_code} - {response.text}")
                            except Exception as req_err:
                                logger.error(f"Request to backend failed: {req_err}")
                        else:
                            logger.warning("Could not extract customer email from body.")
            except Exception as e:
                logger.error(f"Error processing individual email {e_id}: {e}")

        mail.close()
        mail.logout()

    except Exception as e:
        logger.error(f"IMAP connection or processing error: {e}")

if __name__ == "__main__":
    logger.info("Starting Selar Sales Poller...")
    while True:
        process_emails()
        time.sleep(300)  # Sleep for 5 minutes
