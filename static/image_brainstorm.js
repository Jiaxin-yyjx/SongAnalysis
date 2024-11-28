function show_brainstorming() {
    const brainstormingBox = document.getElementById("brainstormingBox")

    brainstormingBox.style.display = "block";
}

$(document).ready(function () {
    $('#image-form').on('submit', function (event) {
        event.preventDefault();
        let prompt = $('#prompt').val();

        // Show loading indicator and hide generated image
        $('#loading-indicator').show();
        $('#generated-image').hide();

        $.ajax({
            url: '/generate_initial',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ prompt: prompt }),
            success: function (response) {
                // Hide loading indicator and handle job response
                // $('#loading-indicator').hide();

                if (response.job_id) {
                    // If job_id is returned, check job status every 2 seconds
                    checkJobStatus(response.job_id);
                } else {
                    alert('Error: Job ID not returned');
                }
            },
            error: function (xhr, status, error) {
                console.error('Error:', error);
                $('#loading-indicator').hide();
            }
        });
    });

    // Function to check job status
    function checkJobStatus(jobId) {
        $.ajax({
            url: `/check-job-status/${jobId}`,
            type: 'GET',
            success: function (response) {
                console.log("Generate image status: ", response.status)
                console.log("Job: ", response)
                if (response.status === 'finished') {
                    if (response.result.error) {
                        $('#loading-indicator').hide();
                        console.log("error: ", response.result.error);
                        alert(`Error: ${response.result.error}. Check API dashboard and try again.`);
                        return; // Exit the function to prevent further processing
                    }else{
                        $('#loading-indicator').hide();
                        // Job completed, show the generated image
                        $('#generated-image').attr('src', response.result.output).show();
                    }

                } else if (response.status === 'failed') {
                    // Job failed, show error message
                    alert(`Error: ${response.result.error || 'An error occurred while processing the image'}`);
                } else {
                    // Job still processing, check again in 2 seconds
                    setTimeout(function () {
                        checkJobStatus(jobId);
                    }, 3000);
                }
            },
            error: function (xhr, status, error) {
                console.error('Error checking job status:', error);
                $('#loading-indicator').hide();
            }
        });
    }

    // Make the image draggable
    $('#output-container').on('mousedown', '#generated-image', function (event) {
        let $image = $(this);
        let offsetX = event.clientX - $image.position().left;
        let offsetY = event.clientY - $image.position().top;

        $(document).on('mousemove.draggable', function (event) {
            $image.css({
                left: event.clientX - offsetX,
                top: event.clientY - offsetY
            });
        });

        $(document).on('mouseup.draggable', function () {
            $(document).off('.draggable');
        });
    });
});

// $(document).ready(function () {
//     $('#image-form').on('submit', function (event) {
//         event.preventDefault();
//         let prompt = $('#prompt').val();

//         // Show loading indicator and hide generated image
//         $('#loading-indicator').show();
//         $('#generated-image').hide();

//         $.ajax({
//             url: '/generate_initial',
//             type: 'POST',
//             contentType: 'application/json',
//             data: JSON.stringify({ prompt: prompt }),
//             success: function (response) {
//                 // Hide loading indicator and show generated image
//                 $('#loading-indicator').hide();
//                 $('#generated-image').attr('src', response.output).show();
//             },
//             error: function (xhr, status, error) {
//                 console.error('Error:', error);
//                 $('#loading-indicator').hide();
//             }
//         });
//     });
//     // Make the image draggable
//     $('#output-container').on('mousedown', '#generated-image', function (event) {
//         let $image = $(this);
//         let offsetX = event.clientX - $image.position().left;
//         let offsetY = event.clientY - $image.position().top;

//         $(document).on('mousemove.draggable', function (event) {
//             $image.css({
//                 left: event.clientX - offsetX,
//                 top: event.clientY - offsetY
//             });
//         });

//         $(document).on('mouseup.draggable', function () {
//             $(document).off('.draggable');
//         });
//     });
// });