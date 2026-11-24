---
lab:
  title: Get ready for agent development with the Foundry Toolkit
  description: Setup instructions for Azure and Visual Studio Code.
  level: 100
  duration: 20 minutes
  islab: false
---

# Get ready for agent development with the Foundry Toolkit

This exercise should take approximately **20** minutes to complete. It sets up the accounts and tools you'll use in the labs that follow.

> **Note**: Microsoft Azure, Microsoft Foundry, Visual Studio Code, and the Foundry Toolkit extension are subject to continual development. Web pages and menus may change, so some steps may look a little different from these descriptions.

## Create an Azure subscription

If you don;t already have one, you'll need an Azure subscription to complete these labs.

1. In a web browser, sign up for [Azure](https://azure.microsoft.com/pricing/purchase-options/azure-account-c){:target="_blank"} at `https://azure.microsoft.com/pricing/purchase-options/azure-account-c`.
1. Sign up for a *pay-as-you-go* or *free* account.

    > **Note**: There are limitations in the *free* account that may prevent you from completing some tasks in the labs.

## (Optional) Create a GitHub account

If you want to use GitHub Copilot for AI-assisted codng during the labs, you'll need  a GitHub account with access to GitHub Copilot.

1. In a web browser, go to [GitHub](https://github.com/){:target="_blank"} at `https://github.com/` and sign up for an account.
1. Ensure you have an active [GitHub Copilot](https://github.com/features/copilot/plans){:target="_blank"} plan at `https://github.com/features/copilot/plans`.


## Install Visual Studio Code

Visual Studio Code is the code editor and terminal you'll use for the labs.

1. In a web browser, go to the [Visual Studio Code page](https://code.visualstudio.com){:target="_blank"} at `https://code.visualstudio.com`, download the installer for your operating system, and run it. The default options are fine.

    > **Tip**: If you're new to Visual Studio Code, the [documentation](https://code.visualstudio.com/docs){:target="_blank"} is a good place to start.

## Install Git

You'll clone the lab files from GitHub, and Git is the tool that does the cloning.

1. Go to [Git](https://git-scm.com/downloads){:target="_blank"} at `https://git-scm.com/downloads`, download Git for your operating system, and install it.

    The default options are fine. If you're asked how Git should integrate with Visual Studio Code, choose to use Visual Studio Code as the default editor, or leave the default in place.

## Install Python

The labs use Python to build the client applications. You'll also create a virtual environment for each lab, so you'll need a recent version of Python 3.

1. In a web browser, go to [the Python web site](https://www.python.org/downloads){:target="_blank"} at `https://www.python.org/downloads`, and download the latest Python 3 release (version 3.12 or later).
1. Run the installer. On Windows, select the option to **add Python to PATH** before you install.

## Install Visual Studio Code extensions

Extensions in Visual Studio Code enable you to work with tools that assist with agent development.

1. Start Visual Studio Code and complete any final setup configuration.
1. In the *activity bar* on the left, open the **Extensions** page (or press *CTRL+SHIFT+X*).
1. Search for and install the Microsoft **Python** extension.
1. Search for and install the Microsoft **Foundry Toolkit for VS Code** extension.
1. In the activity bar, select the **Accounts** icon and sign into your Microsoft Azure subscription.
1. If you have a GitHub account, also sign into GitHub so you can use GitHub Copilot.

## Check your setup

Open a new terminal (in Visual Studio Code, select **Terminal** > **New Terminal**) and check that the tools are available:

1. Run `git --version`. You should see a Git version number.
1. Run `python --version`. You should see a Python 3.12 or later version number.

    > **Tip**: On Windows, if running `python` opens the Microsoft Store instead, you may need to turn off the **python.exe** app execution alias in **Settings** > **Apps** > **Advanced app settings** > **App execution aliases**, and then open a new terminal.

## Summary

You now have the necessary accounts and tools to get started with AI agent development in Visual Studio Code.

When you're ready, you can start the [Develop an AI agent with the Foundry Toolkit](./01-create-agent.md) exercise.
