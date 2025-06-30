//Animate an element hopping to the center of a container, and then send the appropriate XML afterwards.
function animateToCenter(clickedElem, container, sendXMLAfterAnimation, word, resp) {
    clickedElem.style.opacity = '0';
    // Clone the clicked element
    const clone = clickedElem.cloneNode(true);
    const initialRect = clickedElem.getBoundingClientRect();

    // Copy computed styles exactly
    const computedStyle = window.getComputedStyle(clickedElem);
    for (let prop of computedStyle) {
        clone.style.setProperty(prop, computedStyle.getPropertyValue(prop), computedStyle.getPropertyPriority(prop));
    }

    // Style the clone for absolute positioning
    clone.style.position = 'fixed';
    clone.style.left = `${initialRect.left}px`;
    clone.style.top = `${initialRect.top}px`;
    clone.style.width = `${initialRect.width}px`;
    clone.style.height = `${initialRect.height}px`;
    clone.style.margin = '0';
    clone.style.zIndex = '1000';
    clone.style.pointerEvents = 'none';

    // Place the clone on top of everything
    document.body.appendChild(clone);

    // Get the center of the container
    const containerRect = container.getBoundingClientRect();
    const centerX = containerRect.left + containerRect.width / 2 - initialRect.width / 2;
    const centerY = containerRect.top + containerRect.height / 2 - initialRect.height / 2;

    // Force reflow
    clone.getBoundingClientRect();

    // Animate to center
    clone.style.transition = 'transform 300ms cubic-bezier(0, 0, 0.58, 1), opacity 300ms';
    // Start with scale 1
    clone.style.transform = 'scale(1)';
    clone.style.opacity = '1';

    dx = (centerX - initialRect.left) * 1;
    dy = (centerY - initialRect.top) * 1;
    
    // Animate to center with scale up, then scale down
    setTimeout(() => {
        clone.style.transform = `translate(${dx}px, ${dy}px) scale(1)`;
        clone.style.opacity = '0.3';
    }, 0);

    // Remove the clone after animation
    clone.addEventListener('transitionend', () => {
        clone.remove();
        sendXMLAfterAnimation(word, resp);
    }, { once: true });
}