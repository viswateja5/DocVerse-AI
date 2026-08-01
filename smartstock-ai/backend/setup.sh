#!/bin/bash
# setup.sh - Sets up the Python virtual environment and installs dependencies

echo "Setting up Python virtual environment for SmartStock AI Backend..."

# Check if python3 is installed
if ! command -v python3 &> /dev/null
then
    echo "Python3 could not be found. Please install Python3."
    exit
fi

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install dependencies
pip install -r requirements.txt

echo "Setup complete. To activate the virtual environment, run:"
echo "source venv/bin/activate"
