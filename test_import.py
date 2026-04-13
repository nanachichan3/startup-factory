import sys
sys.stdout.flush()
try:
    # Don't actually run the app, just check imports
    import main
    print("IMPORT_SUCCESS", file=sys.stderr)
except Exception as e:
    print(f"IMPORT_FAILED: {e}", file=sys.stderr)
