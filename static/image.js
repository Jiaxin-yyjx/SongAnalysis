const dropArea = document.getElementById("drop-area");
const inputFile = document.getElementById("input-file");
const imageView = document.getElementById("img-view");

inputFile.addEventListener("change", uploadImage);

function uploadImage() {
    let imgLink = URL.createObjectURL(inputFile.files[0]);
    console.log("image link: " + imgLink);
    setImage(imgLink);
}

// Handles dragging an image from file or image elements
dropArea.addEventListener("dragover", function (e) {
    e.preventDefault();
});

dropArea.addEventListener("drop", function (e) {
    e.preventDefault();

    // Check if the dropped item is a file or an <img> element
    const dataTransfer = e.dataTransfer;

    if (dataTransfer.files.length > 0) {
        // If files are being dropped, handle file upload
        inputFile.files = dataTransfer.files;
        uploadImage();
    } else {
        // If an image element is being dragged
        let imgSrc = e.dataTransfer.getData("text/uri-list");
        if (!imgSrc) {
            // Fallback in case "uri-list" is not supported
            imgSrc = e.dataTransfer.getData("text/html");
            const imgElement = new DOMParser().parseFromString(imgSrc, "text/html").querySelector("img");
            if (imgElement) {
                imgSrc = imgElement.src;
            }
        }

        if (imgSrc) {
            console.log("Image link from drag: " + imgSrc);
            setImage(imgSrc);
        }
    }
});

// Helper function to set the background image
function setImage(imgLink) {
    imageView.style.backgroundImage = `url(${imgLink})`;
    imageView.textContent = "";
    imageView.style.border = 0;
}

// function uploadImage() {
//     let imgLink = URL.createObjectURL(inputFile.files[0]);
//     console.log("image link: " + imgLink);
//     imageView.style.backgroundImage = `url(${imgLink})`;
//     imageView.textContent = "";
//     imageView.style.border = 0;
// }

// dropArea.addEventListener("dragover", function (e) {
//     e.preventDefault();
// })

// dropArea.addEventListener("drop", function (e) {
//     e.preventDefault();
//     inputFile.files = e.dataTransfer.files;
//     uploadImage();
// })

