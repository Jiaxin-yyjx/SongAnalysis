
// $(document).ready(function () {
//     let selectedImagePath = null;

//     // Handle selection of predefined images
//     $('.selectable-image').on('click', function () {
//         // Remove border from previously selected image
//         $('.selectable-image').removeClass('selected');

//         // Add border to the currently selected image
//         $(this).addClass('selected');
//         selectedImagePath = $(this).data('path');  // Store the path of the selected image
//     });

//     // Submit button for predefined image selection
//     $('#submitSelectedImage').on('click', function (event) {
//         if (!selectedImagePath) {
//             alert("Please select an image from the provided options.");
//             return;
//         }

//         // Send the selected image path for further processing
//         var postData = {
//             init_image_path: selectedImagePath,
//             // Add other data if needed
//         };

//         $.ajax({
//             url: '/process-data',
//             type: 'POST',
//             contentType: 'application/json',
//             data: JSON.stringify(postData),
//             success: function (result) {
//                 console.log('Process Data Result:', result);
//             },
//             error: function (error) {
//                 console.error('Error processing selected image:', error);
//             }
//         });
//     });


//     $('#uploadImage').on('submit', function (event) {
//         event.preventDefault();

//         // Get the selected image file
//         var imageFile = $('#imageInput')[0].files[0];
//         if (!imageFile) {
//             alert("Please select an image");
//             return;
//         }

//         // Create FormData object to hold the file
//         var formData = new FormData();
//         formData.append('image', imageFile);

//         // Upload the image using AJAX
//         $.ajax({
//             url: '/upload-image',  // Backend route for image upload
//             type: 'POST',
//             data: formData,
//             contentType: false,
//             processData: false,
//             success: function (response) {
//                 console.log('Image uploaded successfully:', response);
//                 var initImagePath = response.image_path;

//                 // Once the image is uploaded, send the path along with other data
//                 var postData = {
//                     init_image_path: initImagePath,
//                     // Add other data (motion_data, prompts, etc.) here
//                 };

//                 // Send the additional data (including the image path) using AJAX
//                 $.ajax({
//                     url: '/process-data',
//                     type: 'POST',
//                     contentType: 'application/json',
//                     data: JSON.stringify(postData),
//                     success: function (result) {
//                         console.log('Process Data Result:', result);
//                     },
//                     error: function (error) {
//                         console.error('Error processing data:', error);
//                     }
//                 });
//             },
//             error: function (error) {
//                 console.error('Error uploading image:', error);
//             }
//         });
//     });
// });
