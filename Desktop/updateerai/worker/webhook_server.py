from fastapi import FastAPI, Request, HTTPException
import uvicorn
import os
import requests
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configuration
BACKEND_URL = os.getenv('BACKEND_URL', 'http://app:8080/api/v1/admin/credit')
ADMIN_SECRET_KEY = os.getenv('ADMIN_SECRET_KEY')

@app.post("/webhook")
async def receive_sale(request: Request):
    try:
        sale_data = await request.json()
        logger.info(f"Received webhook data: {sale_data}")
        
        # Extract fields based on Zapier/Selar payload structure
        # Note: Adjust these keys based on the actual JSON structure sent by Zapier
        customer_email = sale_data.get("email") or sale_data.get("customer_email")
        product_name = sale_data.get("product_name") or sale_data.get("product")
        
        if not customer_email:
            logger.warning("No email found in webhook data")
            return {"status": "ignored", "reason": "no_email"}

        # Determine product type logic (reused from previous poller logic)
        product_type = None
        if product_name:
            p_lower = product_name.lower()
            if "starter top-up" in p_lower:
                product_type = "starter"
            elif "bulk top-up" in p_lower:
                product_type = "bulk"
            elif "mega top-up" in p_lower:
                product_type = "mega_topup"
            elif "monthly recurring plan" in p_lower or "pro access" in p_lower:
                product_type = "sub"
            elif "starter pack" in p_lower:
                product_type = "starter"
            elif "bulk pack" in p_lower:
                product_type = "bulk"
        
        if not product_type:
            # Fallback: check if 'action' or 'type' is provided directly in webhook
            product_type = sale_data.get("action") or sale_data.get("type")

        if not product_type:
            logger.warning(f"Could not determine product type for: {product_name}")
            return {"status": "ignored", "reason": "unknown_product"}

        logger.info(f"Processing sale: {customer_email} bought {product_name} -> {product_type}")

        # Call backend API
        params = {
            'key': ADMIN_SECRET_KEY,
            'email': customer_email,
            'action': product_type
        }
        
        try:
            response = requests.get(BACKEND_URL, params=params)
            if response.status_code == 200:
                logger.info(f"Successfully credited user: {customer_email}")
                return {"status": "success", "message": "User credited"}
            else:
                logger.error(f"Backend API failed: {response.status_code} - {response.text}")
                raise HTTPException(status_code=500, detail="Backend processing failed")
        except Exception as e:
            logger.error(f"Request to backend failed: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        logger.error(f"Error processing webhook: {e}")
        raise HTTPException(status_code=500, detail="Internal Server Error")

@app.get("/health")
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
