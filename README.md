# Flappy Bird Game for 404 Page

This is a simple implementation of a Flappy Bird style game for a 404 error page. The game is created using HTML, CSS, and JavaScript without additional libraries.

## Features

- Simple and engaging game for a 404 page
- Responsive design, works on mobile devices and desktops
- Control using the space key, mouse click, or screen touch
- Score counting
- Simplified mechanics for a more comfortable gameplay

## Installation

1. Copy all files to the root directory of your web server
2. Configure your web server to use `404.html` as the 404 error page

### Apache Configuration

Add the following line to the `.htaccess` file in the root directory of your site:

```
ErrorDocument 404 /404.html
```

### Nginx Configuration

Add the following line to your server configuration:

```
error_page 404 /404.html;
```

## Project Files

- `index.html` - Main HTML page
- `styles.css` - CSS styles for the page and game
- `game.js` - JavaScript game code
- `icons8-bird.svg` - SVG bird icon

## How to Play

1. When you land on the 404 page, you'll see a game field with a bird
2. Press space, click with the mouse, or touch the screen to start the game
3. Control the bird to fly between the white pipes
4. For each pipe passed, you get one point
5. The game ends if the bird collides with a pipe or the boundaries of the game field

## Game Settings

The game is configured for a comfortable difficulty level:
- Reduced gravity for smoother falling
- Increased gap between pipes
- Slower pipe movement speed
- Less frequent appearance of new pipes
- Small margin of error when detecting collisions

## License

Bird icon provided by [Icons8](https://icons8.com). 