console.log("A");
populateProductList();
async function getProductIDs() {
  const promise = fetch("/get-products").then((r) => r.json());

  return await promise;
}
async function createProductEntry(id) {
  const promise = fetch(
    "/get-product-information?" +
      new URLSearchParams({
        product_id: id,
      }),
  ).then((r) => r.json());
  const data = await promise;

  return `<li>
<a href="/checkout?product_id=${id}">Purchase</a>
<h3>${data.name}</h3>
<p>${data.description}</p>
</li>`;
}

async function populateProductList() {
  const products_list = document.getElementById("products");
  if (!products_list) {
    console.log("No products list.");
    // on the wrong page
    return;
  }
  const products = await getProductIDs();
  console.log(products);

  const promises = [];
  for (const product_id of products) {
    promises.push(createProductEntry(product_id));
  }
  for (const element of await Promise.all(promises)) {
    products_list.innerHTML += element;
  }

  // 1. /get-products
  // 2. for each thing returned, /get-product-information
  // 3. format a little
}
