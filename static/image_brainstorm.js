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
                // Hide loading indicator and show generated image
                $('#loading-indicator').hide();
                $('#generated-image').attr('src', response.output).show();
            },
            error: function (xhr, status, error) {
                console.error('Error:', error);
                $('#loading-indicator').hide();
            }
        });
    });
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