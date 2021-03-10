function addProduct(event, element) {
  event.preventDefault();

  let data = {};

  let formInputs = element.elements;

  for (var i=0; i < formInputs.length; i++) {
    let formInput = formInputs[i];
    if (formInput.nodeName === 'INPUT' && formInput.type === 'text') {
      if (formInput.name !== 'id') {
        data[formInput.name] = formInput.value;
      } 
    }
  }

  const config = {};

  axios.post('/products', data, config)
    .then(res => {
      console.log(res.data);
    })
    .catch(err => {
      if (err.response) {
        const errRes = err.response;
        console.error(errRes.status, errRes.data);
      }
    });
}

function getProducts() {
  axios.get('/products')
    .then(res => {
      const products = res.data;
      const productListElem = document.getElementById('existing_products');
    
      let listHTML = '';
    
      products.forEach(product => {
        const listTagOpen = '<li' + ' id="' + product._id + '">';
        const listTagClose = '</li>';
        listHTML += listTagOpen + ' <span>' + product.name + '</span> <span>' + product.price + listTagClose + '</span>';
      });
      productListElem.innerHTML = listHTML;
    
      products.forEach(product => {
        let listElem = document.getElementById(product._id);
        listElem.addEventListener('click', (event) => {
          const id = event.currentTarget.id;
          const name = event.currentTarget.querySelector('span:first-child').innerText;
          const price = event.currentTarget.querySelector('span:nth-child(2)').innerText;
          
          const formElem = document.getElementById('product_form');
          const formInputs = formElem.elements;
          for (var i=0; i < formInputs.length; i++) {
            let formInput = formInputs[i];
            switch (formInput.name) {
              case 'id':
                formInput.value = id;
                break;
              case 'name':
                formInput.value = name;
                break;
              case 'price':
                formInput.value = price;
                break;
              default:
                break;
            }
          }
        });
      });
    })
    .catch(err => {
      const errRes = err.response;
      console.error(errRes.status, errRes.data);
    });
}

function updateProduct() {
  const formElem = document.getElementById('product_form');
  const formInputs = formElem.elements;
  
  let data = {};
  for (var i=0; i < formInputs.length; i++) {
    let formInput = formInputs[i];
    if (formInput.nodeName === 'INPUT') {
        data[formInput.name] = formInput.value;
    }
  }
  
  axios.put('/products', data)
  .then(res => {
    console.log(res);
    getProducts();
  })
  .catch(err => {
    const errRes = err.response;
    console.error(errRes.status, errRes.data);
  });
}
