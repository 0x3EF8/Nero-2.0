# Nero 2.0 - Your Intelligent Companion for Any Inquiry!

![Nero 2.0](Nero%202.0.png)

| [Home](#nero-20---your-intelligent-companion-for-any-inquiry) | [Features](#features) | [Getting Started](#getting-started) | [Usage](#usage) | [License](LICENSE) | [Changelog](../CHANGELOG.md) | [API](API.md) | [Contribute](CONTRIBUTING.md) |

**Nero 2.0** is a Facebook Messenger bot that provides answers to a variety of questions. It is built on a modified version of the [fca-unofficial](https://github.com/VangBanLaNhat/fca-unofficial) library. The original library had issues with logging in, but **John Paul Caigas** fixed these problems to ensure Nero 2.0 works smoothly and reliably.

## Features

1. **Command List**: Send "cmd" to Nero 2.0 to see all available commands.

## Getting Started

Setting up Nero 2.0 is easy. Follow these steps:

1. **Installation**: 
   - Clone the repository:
     ```bash
     git clone https://github.com/0x3EF8/Nero-2.0.git
     ```
   - Navigate into the project directory:
     ```bash
     cd Nero-2.0
     ```

2. **Install Dependencies**: 
   - Make sure you have Node.js installed. Download it from [nodejs.org](https://nodejs.org/).
   - Install the required packages using npm:
     ```bash
     npm install
     ```

3. **Running the Bot**: 
   - To start the bot in development mode, use:
     ```bash
     npm run dev
     ```
   - To run it normally, you can use:
     ```bash
     node index.js
     ```
   - Alternatively, you can also use:
     ```bash
     npm start
     ```
## Usage

- To interact with Nero 2.0, add the account you used to connect to Nero-2.0 into a group chat.
- Use commands like:
  - Ask a question: `nero <your_question>`
  - Get command list: `cmd`

## Contributing

We welcome contributions! Check our [Contribution Guidelines](CONTRIBUTING.md) to get started.

## API Documentation

For details about the API, refer to our [API Documentation](API.md).

## Changelog

See recent updates in the [Changelog](../CHANGELOG.md).

## Credits

- **fca-unofficial Library**: Built on the [fca-unofficial](https://github.com/VangBanLaNhat/fca-unofficial) library.
- **John Paul Caigas**: Thanked for fixing login issues in the original library.
- **Melvin Jones Gallano Repol**: Grateful for his support during development.

Thank you for using Nero 2.0! We hope it serves you well.
