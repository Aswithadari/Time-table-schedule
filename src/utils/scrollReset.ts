
export const resetScrollToTop = () => {
  // Reset main window scroll
  window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  
  // Reset any scroll areas within the page
  const scrollAreas = document.querySelectorAll('[data-radix-scroll-area-viewport]');
  scrollAreas.forEach(area => {
    if (area instanceof HTMLElement) {
      area.scrollTop = 0;
      area.scrollLeft = 0;
    }
  });
  
  // Reset any other scrollable containers
  const scrollableContainers = document.querySelectorAll('.overflow-auto, .overflow-y-auto, .overflow-x-auto');
  scrollableContainers.forEach(container => {
    if (container instanceof HTMLElement) {
      container.scrollTop = 0;
      container.scrollLeft = 0;
    }
  });
};
