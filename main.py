import mimetypes
import os

import stripe
from dotenv import load_dotenv
from flask import Flask, Response, jsonify, request

load_dotenv()
SECRET_KEY = os.getenv("STRIPE_SK")

client = stripe.StripeClient(
    SECRET_KEY,
)

app = Flask(__name__, static_url_path="", static_folder="public")

DOMAIN = "http://127.0.0.1:5000"


@app.route("/create-checkout-session", methods=["POST"])
def create_checkout_session():
    try:
        session = client.v1.checkout.sessions.create(
            params={
                "ui_mode": "elements",
                "line_items": [
                    {
                        "price": request.args.get("price_id"),
                        "quantity": 1,
                    }
                ],
                "mode": "payment",
                "return_url": DOMAIN
                + "/complete.html?session_id={CHECKOUT_SESSION_ID}",
            }
        )
    except Exception as e:
        print("err:", e)
        return str(e)

    print(session.client_secret)
    return jsonify(clientSecret=session.client_secret)


@app.route("/get-products", methods=["GET"])
def get_products():  # returns a JSON of only the product IDs
    client_products = []
    try:
        products = client.v1.products.list().data
    except Exception as e:
        print("err:", e)
        return str(e)

    for product in products:
        client_products.append(product.id)
    print(client_products)
    return jsonify(client_products)


@app.route("/get-product-information", methods=["GET"])
def get_product_information():
    client_info = {}
    product_id = request.args.get("product_id")
    if product_id == None or product_id == "":
        return "no product specified"

    try:
        product = client.v1.products.retrieve(product_id)
    except Exception as e:
        print("err:", e)
        return jsonify({"err": str(e)})
    client_info["name"] = product.name
    client_info["description"] = product.description
    client_info["images"] = product.images
    client_info["type"] = product.type

    print(product)
    return jsonify(client_info)


@app.route("/get-price", methods=["GET"])
def get_price():
    product_id = request.args.get("product_id")
    if product_id == None or product_id == "":
        return "no product specified"
    try:
        product = client.v1.products.retrieve(product_id)
    except Exception as e:
        print("err:", e)
        return str(e)
    print(product)
    # then, we'll want to retrieve the price

    try:
        price = client.v1.prices.search({"query": f"product:'{product_id}'"}).data[0]
        return jsonify(price["id"])
    except Exception as e:
        print("err:", e)
        return str(e)


@app.route("/session-status", methods=["GET"])
def session_status():
    session = client.v1.checkout.sessions.retrieve(
        request.args.get("session_id"),
        params={"expand": ["payment_intent", "subscription"]},
    )

    return jsonify(
        status=session.status,
        payment_status=session.payment_status,
        payment_intent_id=session.payment_intent.id if session.payment_intent else None,
        payment_intent_status=(
            session.payment_intent.status if session.payment_intent else None
        ),
        subscription_id=(
            None
            if session.payment_intent
            else (session.subscription.id if session.subscription else None)
        ),
        subscription_status=(
            None
            if session.payment_intent
            else (session.subscription.status if session.subscription else None)
        ),
    )


@app.route("/")
def index():
    with open("public/index.html") as f:
        content = f.read()
        mime = mimetypes.guess_type("index.html")[0]
        return Response(content, mimetype=mime)


@app.route("/<page>")
def single_page(page):
    if "." not in page:
        page = page + ".html"
    with open("public/" + page) as f:
        content = f.read()
        mime = mimetypes.guess_type(page)[0]
        return Response(content, mimetype=mime)
