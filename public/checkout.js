const stripe = Stripe(
  "pk_test_51GqAk0IisHAWwPA8fXoyrP101BrGaiRms30CZ1h9xgzznp9bY2D8xclH6I0NWuy1yUHJygH4pXeEgzx2CuFxHTXR009dA9ziyW",
);

let checkout;
let actions;

setup();

document
  .querySelector("#payment-form")
  .addEventListener("submit", handleSubmit);

async function setup() {
  const paramString = document.URL.split("?")[1];
  const queryString = new URLSearchParams(paramString);

  let price_id;
  if (!queryString.has("product_id")) {
    showMessage("No product ID!");
    setLoading(false);
  } else {
    const product_id = queryString.get("product_id");
    console.log(`id: ${product_id}`);
    const promise = await fetch(
      "/get-price?" +
        new URLSearchParams({
          product_id: product_id,
        }),
    ).then((r) => r.json());
    price_id = await promise;
  }
  console.log(
    "/create-checkout-session?" +
      new URLSearchParams({
        price_id: price_id,
      }),
  );
  const promise = fetch(
    "/create-checkout-session?" +
      new URLSearchParams({
        price_id: price_id,
      }),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    },
  )
    .then((r) => r.json())
    .then((r) => r.clientSecret);

  const appearance = {
    theme: "stripe",
  };

  checkout = stripe.initCheckoutElementsSdk({
    clientSecret: promise,
    elementsOptions: { appearance },
  });

  checkout.on("change", (session) => {
    document.getElementById("submit").disabled = !session.canConfirm;
  });

  const loadActionsResult = await checkout.loadActions();
  if (loadActionsResult.type === "success") {
    actions = loadActionsResult.actions;
    const session = loadActionsResult.actions.getSession();
    document.querySelector("#button-text").textContent = `Pay ${
      session.total.total.amount
    } now`;
  }

  const contactDetailsElement = checkout.createContactDetailsElement();
  contactDetailsElement.mount("#contact-details-element");

  const paymentElement = checkout.createPaymentElement();
  paymentElement.mount("#payment-element");
}

async function handleSubmit(e) {
  e.preventDefault();
  setLoading(true);

  if (!actions) {
    return;
  }

  const confirmResult = await actions.confirm();

  // If we reach this point, the redirect failed (so an error happened).
  if (confirmResult.type === "error") {
    showMessage(confirmResult.error.message);
  }
}

function showMessage(messageText) {
  const messageContainer = document.querySelector("#payment-message");

  messageContainer.classList.remove("hidden");
  messageContainer.textContent = messageText;
}

// Show a spinner on payment submission
function setLoading(isLoading) {
  if (isLoading) {
    // Disable the button and show a spinner
    document.querySelector("#submit").disabled = true;
    document.querySelector("#spinner").classList.remove("hidden");
    document.querySelector("#button-text").classList.add("hidden");
  } else {
    document.querySelector("#submit").disabled = false;
    document.querySelector("#spinner").classList.add("hidden");
    document.querySelector("#button-text").classList.remove("hidden");
  }
}
