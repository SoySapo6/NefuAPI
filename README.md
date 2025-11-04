![Logo](https://files.catbox.moe/wg9ysl.png)

A redesigned and upgraded edition of **Rynn UI** with a smoother user interface, optimized user experience, and extended API endpoint support.

## Features
- A more professional and minimalist interface.
- Easily customizable with a `settings.json` file
- Categorized APIs for easy navigation
- Includes real-time settings such as name, version, description, and creator
- Supports image display in the UI for branding

## Live Demo

Check out a live demo of NefuAPI
[here](api.nefu.life)

## Setup

### Prerequisites
- Node.js (>= 14.0.0)

### Installation
1. Clone the repository to your local machine:
   ```bash
   git clone https://github.com/SoySapo6/NefuAPI/
   ```
2. Navigate to the project directory:
   ```bash
   cd NefuAPI
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Modify the `settings.json` file to configure your API documentation.
5. Start the server:
   ```bash
   npm start
   ```
Your API documentation should now be available at `http://localhost:<PORT>`.

### General Settings

- `name`: Sets the name of your API (e.g., "MayAPI").
- `version`: Specifies the version of your API interface (e.g., "1.0.0").
- `description`: A brief description of your API documentation.

### Header Customization

- `status`: Indicates the current status of your API (e.g., "Online!").
- `imageSrc`: An array of image URLs to display in the header. Multiple images can be set for variety.
- `imageSize`: Defines responsive image sizes based on the device type:
  - `mobile`: Size for mobile devices (e.g., "80%").
  - `tablet`: Size for tablets (e.g., "40%").
  - `desktop`: Size for desktops (e.g., "40%").

### Api Settings

- `creator`: Displays the creator's name in the interface.

# Support

This project is designed to be easily deployable on various platforms. You can host it on any platform that supports Node.js applications. Some popular options include:

- **[Vercel](https://vercel.com/)**: Easy deployment with minimal configuration.
- **[Heroku](https://www.heroku.com/)**: A platform-as-a-service for deploying, managing, and scaling apps.
- **[Netlify](https://www.netlify.com/)**: A platform for deploying static sites and serverless functions.
- **[DigitalOcean](https://www.digitalocean.com/)**: Cloud infrastructure for deploying apps with more control over the environment.
- **[AWS](https://aws.amazon.com/)**: Amazon Web Services for scalable and customizable cloud hosting.
- **[Railway](https://railway.app/)**: A platform for deploying apps with easy integration and deployment steps.

Make sure your platform supports Node.js, and configure it to run your API according to the platform’s deployment guidelines.

If you need help with deployment, feel free to reach out to the creator or check the documentation of your chosen platform.
# Credits

This project is created and maintained by:


- **[Rynn](https://github.com/rynxzyy)**: Creator and main developer of the project.
- **[SoyMaycol](https://github.com/SoySao6)**: API enhancer and maintainer. 
- **[Lenwy](https://github.com/Lenwyy)**: For the inspiration behind the project.
- **[Siputzx](https://github.com/siputzx)**: For providing the LuminAI API.

Special thanks for the support and contributions throughout the development.

## License

This project is licensed under the [MIT License](LICENSE).
