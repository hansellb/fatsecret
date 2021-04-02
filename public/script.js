/**
 * Loads images
 *
 * @param {*} event
 * @param {*} element
 */
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
      imgsHTML += '<div class="img-container" onclick="deleteImage(\'' + img + '\', this)"><div class="delete-overlay">Click to delete</div><img src="' + img + '"></div>'
    });

    imgContainer.innerHTML = imgsHTML;
  })
  .catch(err => {
    handleAxiosErrors(err);
  });
}

/**
 * Upload an image
 *
 * @param {*} event
 * @param {*} element
 */
function uploadImage(event, element) {
  event.preventDefault();

  const formData  = new FormData(element);
  const config    = {};

  axios.post('/img', formData, config)
  .then(res => {
    console.log(res.data);
    loadImages();
  })
  .catch(err => {
    handleAxiosErrors(err);
  });
}

/**
 * Delete an image
 *
 * @param {*} imgName
 * @param {*} element
 */
function deleteImage(imgName, element) {
  axios.delete('/img/' + imgName)
  .then(res => {
    // location.reload();
    element.remove();
//    loadImages();
  })
  .catch(err => {
    handleAxiosErrors(err);
  });
}

/**
 * Compare Image Analysis results from different APIs
 *
 * @param {*} event
 * @param {*} element
 */
function getImgAnalysis(event, element) {
  event.preventDefault();

  const formData  = new FormData(element);
  const config    = {};

  axios.post('/compare', formData, config)
  .then(res => {
    // console.log(res.data);
    const azureUl     = document.getElementById('azure_tags');
    const googleUl    = document.getElementById('google_labels');
    const awsUl       = document.getElementById('aws_labels');
    const clarifaiUl  = document.getElementById('clarifai_concepts');

    let awsLabels = '';
    let azureTags = '';
    let clarifaiConcepts = '';
    let googleLabels = '';

    Object.keys(res.data).forEach(api => {
      switch(api) {
        case 'aws':
          res.data.aws.forEach(label => {
            awsLabels += '<li>' + label.Name + ' -> ' + label.Confidence + '</li>';
          });
          break;
        case 'azure':
          res.data.azure.forEach(tag => {
            azureTags += '<li>' + tag.name + ' -> ' + tag.confidence + '</li>';
          });
          break;
        case 'clarifai':
          res.data.clarifai.forEach(concept => {
            clarifaiConcepts += '<li>' + concept.name + ' -> ' + concept.value + '</li>';
          });
          break;
        case 'google':
          res.data.google.forEach(label => {
            googleLabels += '<li>' + label.description + ' -> ' + label.topicality + '</li>';
          });
          break;
        default:
          console.log(api);
          break;
      }
    });

    // res.data[api].forEach(label => {

    // });

    awsUl.innerHTML       = awsLabels;
    azureUl.innerHTML     = azureTags;
    googleUl.innerHTML    = googleLabels;
    clarifaiUl.innerHTML  = clarifaiConcepts;
  })
  .catch(err => {
    handleAxiosErrors(err);
  });
}

/**
 * Axios error handler
 *
 * @param {*} err
 */
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