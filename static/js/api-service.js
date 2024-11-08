let apiService = (function () {
  let module = {};

  module.getLatestImage = function () {
    return fetch(`/api/images/`).then((res) => res.json());
  };

  module.getImage = function (timestamp, direction) {
    // query params are timestamp and direction
    return fetch(
      `/api/images?timestamp=${timestamp}&direction=${direction}`
    ).then((res) => res.json());
  };

  module.getImageById = function (imageId) {
    return fetch(`/api/images/${imageId}`).then((res) => res.json());
  };

  module.addImage = function (formData) {
    return fetch("/api/images", {
      method: "POST",
      body: formData,
    }).then((res) => res.json());
  };

  module.deleteImage = function (imageId) {
    return fetch(`/api/images/${imageId}`, {
      method: "DELETE",
    }).then((res) => res.json());
  };

  module.addComment = function (imageId, author, content) {
    return fetch(`/api/comments/${imageId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        author: author,
        content: content,
      }),
    }).then((res) => res.json());
  };

  module.deleteComment = function (commentId) {
    return fetch(`/api/comments/${commentId}`, {
      method: "DELETE",
    }).then((res) => res.json());
  };

  module.getLatestComments = function (imageId) {
    return fetch(`/api/comments/${imageId}`).then((res) => res.json());
  };

  module.getComments = function (imageId, timestamp, direction) {
    return fetch(
      `/api/comments/${imageId}?timestamp=${timestamp}&direction=${direction}`
    ).then((res) => res.json());
  };

  return module;
})();
