# Quick fix for notebook imports
import os
import sys

# Add current directory to Python path
current_dir = os.getcwd()
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

print(f"✅ Python path fixed! Current directory: {current_dir}")

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

if load_dotenv:
    load_dotenv()

if 'FRED_API_KEY' not in os.environ:
    raise RuntimeError(
        "FRED_API_KEY environment variable is missing. "
        "Create a .env file or set the variable before running this helper script."
    )

print(f"✅ API key detected: {'FRED_API_KEY' in os.environ}")

# Test imports
try:
    from src.fetch_data import fetch_sp500_from_fred
    from src.features import build_feature_set
    from src.labels import make_std_labels
    from src.config import LABEL_HORIZON
    print("✅ All imports successful!")
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're in the project_solutions directory")
