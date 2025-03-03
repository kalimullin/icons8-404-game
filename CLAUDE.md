# Claude Guide: Icons8 404 Flappy Bird Game

## Project Structure
- `404.html` - HTML 404 error page
- `index.html` - Copy of the 404 page for testing
- `styles.css` - CSS styles for the page and game
- `game.js` - JavaScript game logic
- `*.svg` - SVG assets (bird icon, grid)

## Commands
- Test the page: Open `index.html` in a browser
- Deploy: Copy all files to your web server's root directory

## Code Style Guidelines
- **HTML**: Use semantic HTML5 elements, double quotes for attributes
- **CSS**: 
  - Classes use kebab-case
  - IDs use camelCase
  - Properties grouped by type (layout, typography, visual)
  - Media queries at end of file
- **JavaScript**:
  - Use camelCase for variables, functions
  - Comment functions for clarity
  - Prefix private variables with underscore
  - Use `const` for DOM elements and constants
  - Use explicit pixel values, floor them for pixel-perfect rendering
  - Keep animation-related code in dedicated functions
  - Handle errors with graceful fallbacks

## Error Handling
- Check for DOM elements existence before use
- Use defensive programming for user interactions
- Apply graceful degradation for different screen sizes