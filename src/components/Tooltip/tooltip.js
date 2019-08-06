export const Tooltip = () => {
    // Get all the toggletip buttons
    var toggletips = document.querySelectorAll('[data-toggletip-content]');
  
    // Iterate over them
    Array.prototype.forEach.call(toggletips, function (toggletip) {
      // Get the message from the data-content element
      var message = toggletip.getAttribute('data-toggletip-content');
  
      // Get the live region element
      var liveRegion = toggletip.nextElementSibling;
  
      // Toggle the message
      toggletip.addEventListener('click', function () {
          liveRegion.innerHTML = '';
          window.setTimeout(function() {
            liveRegion.innerHTML = '<span class="toggletip-bubble">'+ message +'</span>';
          }, 100);
      });
  
      // Close on outside click
      document.addEventListener('click', function (e) {
        if (toggletip !== e.target) {
          liveRegion.innerHTML = '';
        }                        
      });
  
      // Remove toggletip on ESC
      toggletip.addEventListener('keydown', function (e) {
        if ((e.keyCode || e.which) === 27)
        liveRegion.innerHTML = '';
      });
      
      // Remove on blur
      toggletip.addEventListener('blur', function (e) {
        liveRegion.innerHTML = '';
      });
    });
  };