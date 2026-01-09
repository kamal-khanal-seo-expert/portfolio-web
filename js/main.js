// Minimal JS for simple interactions
document.addEventListener('DOMContentLoaded', function () {
	// Mobile nav toggle placeholder (can be enhanced later)
	const nav = document.querySelector('nav[role="navigation"]');

	// Accessibility helper: add a class when user tabs for visible focus styles
	document.body.addEventListener('keyup', (e) => {
		if (e.key === 'Tab') document.body.classList.add('user-is-tabbing');
	});
});