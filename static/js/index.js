(function () {
  "use strict";

  document
    .querySelector(".add-image-btn")
    .addEventListener("click", function () {
      let form = document.getElementById("add-image-box");
      let button = document.querySelector(".add-image-btn");
      if (form.style.display === "none") {
        form.style.display = "block";
        button.innerHTML = "I'm done adding!";
      } else {
        form.style.display = "none";
        button.innerHTML = "Add Image";
      }
    });

  function update(response) {
    let image = response.image;
    let hasNext = response.hasNext;
    let hasPrev = response.hasPrev;

    let div = document.getElementById("image-display");

    if (image !== null) {
      localStorage.setItem("currImgId", image.id);

      div.innerHTML = `<div>
        <h1 class="img-title">${image.title}</h1>
        <div class="img-container">
          <div>
            <div>
              <button id="prev">Prev</button>
              <button id="next">Next</button>
            </div>
            <img class="displayed" src="api/images/${image.id}/picture" alt="${image.title}" />
            <div><strong>Author: </strong>${image.author}</div>
            <div>
              <button id="delete">Delete</button>
            </div>
          </div>
        </div>
      </div>
      <div class="flex">
        <div class="col-1 col-sm-0"></div>
        <div id="comment-box" class="col-10 col-sm-12">
          <form id="comment-form">
            <div><h1>Comments</h1></div>
            <div>Add a comment!</div>
            <label for="comment-name">Name:</label>
            <input type="text" id="comment-name" name="comment-name" required />
            <label for="comment">Comment:</label>
            <input type="textarea" id="comment" comment="url" required />
            <button type="submit" class="submit-btn">Post!</button>
          </form>
          <div id="comments">
          </div>
          <div class="col-1 col-sm-0"></div>
        </div>
      </div>`;

      if (!hasPrev) {
        document.getElementById("prev").classList.add("greyed-out");
      } else {
        document.getElementById("prev").addEventListener("click", function () {
          apiService
            .getImage(image.createdAt, "prev")
            .then(function (response) {
              update(response);
            });
        });
      }

      if (!hasNext) {
        document.getElementById("next").classList.add("greyed-out");
      } else {
        document.getElementById("next").addEventListener("click", function () {
          apiService
            .getImage(image.createdAt, "next")
            .then(function (response) {
              update(response);
            });
        });
      }

      document.getElementById("delete").addEventListener("click", function () {
        apiService.deleteImage(image.id).then(
          apiService
            .getImage(image.createdAt, "prev")
            .then(function (response) {
              update(response);
            })
        );
      });

      function updateComments(response) {
        let comments = response.comments;

        let div = document.getElementById("comments");
        div.innerHTML = "";

        if (comments.length === 0) {
          div.innerHTML = `<div class="no-comment">
          There aren't any comments yet. Why don't you add some?
          </div>`;
        } else {
          let hasNext = response.hasNext;
          let hasPrev = response.hasPrev;
          let prevTimestamp = response.prevTimestamp;
          let nextTimestamp = response.nextTimestamp;

          comments.forEach(function (comment) {
            let elem = document.createElement("div");
            let id = comment.id;

            elem.id = `${id}`;
            elem.innerHTML = `<div class="comment">
              <div><strong>Posted by: </strong>${comment.author}, ${new Date(
              comment.createdAt
            ).toLocaleString("en-US", { timeZone: "America/New_York" })}</div>
              <div>${comment.content}</div>
              <button class="delete-comment delete-comment-${id}">Delete</button>
            </div>`;
            div.append(elem);

            document
              .querySelector(`.delete-comment-${id}`)
              .addEventListener("click", function () {
                apiService.deleteComment(id).then(function () {
                  // Add one millisecond to the latest comments timestamp,
                  // then get the previous comments before that timestamp
                  // so we ensure do not lose the latest comment.
                  nextTimestamp = new Date(nextTimestamp);
                  nextTimestamp.setMilliseconds(
                    nextTimestamp.getMilliseconds() + 1
                  );
                  nextTimestamp = nextTimestamp.toISOString();

                  apiService
                    .getComments(image.id, nextTimestamp, "prev")
                    .then(function (response) {
                      updateComments(response);
                    });
                });
              });
          });

          let prevButton = document.createElement("button");
          prevButton.id = "prev-com";
          prevButton.innerHTML = "Prev Comments";
          div.append(prevButton);
          let nextButton = document.createElement("button");
          nextButton.id = "next-com";
          nextButton.innerHTML = "Next Comments";
          div.append(nextButton);

          if (!hasPrev) {
            document.getElementById("prev-com").classList.add("greyed-out");
          } else {
            document
              .getElementById("prev-com")
              .addEventListener("click", function () {
                apiService
                  .getComments(image.id, prevTimestamp, "prev")
                  .then(function (response) {
                    updateComments(response);
                  });
              });
          }
          if (!hasNext) {
            document.getElementById("next-com").classList.add("greyed-out");
          } else {
            document
              .getElementById("next-com")
              .addEventListener("click", function () {
                apiService
                  .getComments(image.id, nextTimestamp, "next")
                  .then(function (response) {
                    updateComments(response);
                  });
              });
          }
        }
      }

      document
        .getElementById("comment-form")
        .addEventListener("submit", function (e) {
          e.preventDefault();

          let author = document.getElementById("comment-name").value;
          let content = document.getElementById("comment").value;

          apiService.addComment(image.id, author, content).then(
            apiService.getLatestComments(image.id).then(function (response) {
              updateComments(response);
            })
          );

          document.getElementById("comment-form").reset();
        });

      apiService.getLatestComments(image.id).then(function (response) {
        updateComments(response);
      });
    } else {
      div.innerHTML = "There aren't any images yet. Why don't you add some?";
    }
  }

  window.addEventListener("load", function () {
    document
      .getElementById("add-image")
      .addEventListener("submit", function (e) {
        e.preventDefault(); // Prevent refresh
        const formData = new FormData(e.target);
        const formProps = Object.fromEntries(formData);

        // disable submit button
        e.target.querySelector(".submit-btn").disabled = true;

        if (formProps.author.length === 0 || formProps.title.length === 0) {
          e.target.querySelector(".submit-btn").disabled = false;
          return;
        }

        apiService
          .addImage(formData)
          .then(function () {
            apiService.getLatestImage().then(function (res) {
              update(res);
            });
          })
          .then(function () {
            e.target.reset();
            e.target.querySelector(".submit-btn").disabled = false;
          });
      });

    if (localStorage.getItem("currImgId")) {
      // If the id in local storage is valid, get that image
      apiService
        .getImageById(localStorage.getItem("currImgId"))
        .then(function (res) {
          if (res.image) {
            update(res);
          } else {
            apiService.getLatestImage().then(function (res) {
              update(res);
            });
          }
        });
    } else {
      // Otherwise just get the latest image
      apiService.getLatestImage().then(function (response) {
        update(response);
      });
    }
  });
})();
