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
      handleAxiosErrors(err);
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
      handleAxiosErrors(err);
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
    handleAxiosErrors(err);
  });
}

function loadImages(event, element) {
  const imgContainer = document.querySelector('.flex-container');

  axios.get('/img')
  .then(res => {
    if (!res.data || !res.data.imgs || res.data.imgs.length === 0) {
      console.log('No images found!');
    }
    const imgs = res.data.imgs;

    imgsHTML = '';
    imgs.forEach(img => {
      imgsHTML += '<div class="img-container" onclick=deleteImage("' + img + '")><div class="delete-overlay">Click to delete</div><img src="' + img + '"></div>'
    });

    imgContainer.innerHTML = imgsHTML;
  })
  .catch(err => {
    handleAxiosErrors(err);
  });
}

function uploadImage(event, element) {
  event.preventDefault();

  const formData = new FormData(element);

  const config = {};

  axios.post('/img', formData, config)
  .then(res => {
    console.log(res.data);
    loadImages();
  })
  .catch(err => {
    handleAxiosErrors(err);
  });
}

function deleteImage(imgName) {
  axios.delete('/img/' + imgName)
  .then(res => {
    // location.reload();
    loadImages();
  })
  .catch(err => {
    handleAxiosErrors(err);
  });
}

function getImgAnalysis(event, element) {
  event.preventDefault();

  const formData = new FormData(element);

  const config = {};

  axios.post('/compare', formData, config)
  .then(res => {
    console.log(res.data);
    const azureUl = document.getElementById('azure_tags');
    const googleUl = document.getElementById('google_labels');
    const awsUl = document.getElementById('aws_labels');

    let azureTags = '';
    res.data.azure.forEach(tag => {
      azureTags += '<li>' + tag.name + ' -> ' + tag.confidence + '</li>';
    });

    let googleLabels = '';
    res.data.google.forEach(label => {
      googleLabels += '<li>' + label.description + ' -> ' + label.topicality + '</li>';
    });

    azureUl.innerHTML = azureTags;
    googleUl.innerHTML = googleLabels;
  })
  .catch(err => {
    handleAxiosErrors(err);
  });
}

function handleAxiosErrors(err) {
  // https://github.com/axios/axios#handling-errors
  if (err.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    // console.error('err.response', err.response);
    // console.log(err.response.status, err.response.data, err.response.headers);
    console.error(err.response.status, err.response.data);
  } else if (err.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    console.error('err.request', err.request);
  } else {
    // Something happened in setting up the request that triggered an Error
    console.error('err.message', err.message);
  }
  // console.error('err.config', err.config, err.toJSON());
}

window.onload = function () {
  loadImages();
}