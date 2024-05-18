#!/bin/bash

# Navigate to the main directory
cd main/api || { echo "Failed to navigate to the main directory"; exit 1; }

# Run delete.js and wait for it to complete
echo "Running delete.js..."
node delete.js
if [ $? -ne 0 ]; then
  echo "delete.js failed"
  exit 1
fi
echo "delete.js completed"

# Run generate.js and wait for it to complete
echo "Running generate.js..."
node generate.js verifiedverse.com 100
if [ $? -ne 0 ]; then
  echo "generate.js failed"
  exit 1
fi
echo "generate.js completed"

# Run create.js and wait for it to complete
echo "Running create.js..."
node create.js
if [ $? -ne 0 ]; then
  echo "create.js failed"
  exit 1
fi
echo "create.js completed"

echo "Node.js scripts executed successfully"

# Navigate back to the previous directory
cd - || { echo "Failed to navigate back to the previous directory"; exit 1; }

# Navigate to the py directory
cd py || { echo "Failed to navigate to the py directory"; exit 1; }

# Activate the Python virtual environment
source venv/bin/activate
if [ $? -ne 0 ]; then
  echo "Failed to activate the virtual environment"
  exit 1
fi
echo "Virtual environment activated"

# Run the Python script
echo "Running activateLessSecureApp.py..."
python activateLessSecureApp.py
if [ $? -ne 0 ]; then
  echo "activateLessSecureApp.py failed"
  deactivate
  exit 1
fi
echo "activateLessSecureApp.py completed"

# Deactivate the virtual environment
deactivate

echo "All tasks completed successfully"
