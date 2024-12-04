// const dropArea = document.getElementById("drop-area");
// const inputFile = document.getElementById("input-file");
// const imageView = document.getElementById("img-view");

// inputFile.addEventListener("change", uploadImage);

// function uploadImage() {
//     let imgLink = URL.createObjectURL(inputFile.files[0]);
//     console.log("image link: " + imgLink);
//     setImage(imgLink);
// }

// // Handles dragging an image from file or image elements
// dropArea.addEventListener("dragover", function (e) {
//     e.preventDefault();
// });

// dropArea.addEventListener("drop", function (e) {
//     e.preventDefault();

//     // Check if the dropped item is a file or an <img> element
//     const dataTransfer = e.dataTransfer;

//     if (dataTransfer.files.length > 0) {
//         // If files are being dropped, handle file upload
//         inputFile.files = dataTransfer.files;
//         uploadImage();
//     } else {
//         // If an image element is being dragged
//         let imgSrc = e.dataTransfer.getData("text/uri-list");
//         if (!imgSrc) {
//             // Fallback in case "uri-list" is not supported
//             imgSrc = e.dataTransfer.getData("text/html");
//             const imgElement = new DOMParser().parseFromString(imgSrc, "text/html").querySelector("img");
//             if (imgElement) {
//                 imgSrc = imgElement.src;
//             }
//         }

//         if (imgSrc) {
//             console.log("Image link from drag: " + imgSrc);
//             setImage(imgSrc);
//         }
//     }
// });

// // Helper function to set the background image
// function setImage(imgLink) {
//     imageView.style.backgroundImage = `url(${imgLink})`;
//     imageView.textContent = "";
//     imageView.style.border = 0;
// }


const dropArea = document.getElementById("drop-area");
const inputFile = document.getElementById("input-file");
const imageView = document.getElementById("img-view");

inputFile.addEventListener("change", uploadImage);

async function uploadImage() {
    const file = inputFile.files[0];
    if (!file) {
        console.error("No file selected!");
        return;
    }

    try {
        // Create a FormData object to send the file
        const formData = new FormData();
        formData.append("image", file);

        // Send the file to your backend's upload endpoint
        const response = await fetch("/upload_image", {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Failed to upload image: ${response.statusText}`);
        }

        // Parse the response to get the Cloudinary URL
        const data = await response.json();
        const imgLink = data.url; // This assumes your backend sends the Cloudinary `secure_url`

        console.log("Uploaded image URL:", imgLink);
        setImage(imgLink);
    } catch (error) {
        console.error("Error uploading image:", error);
    }
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
            console.log("Image link from drag:", imgSrc);
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

