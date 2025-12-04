## Overview

Add a CLI flag (`-n` or `--num`) to allow users to specify the number of parallel implementations to run, rather than using the hardcoded default of 3. This improves flexibility and allows users to balance cost/time tradeoffs based on their needs.

## Implementation Task List:
1. Add CLI argument parsing for `-n/--num` flag - enables customizable implementation count
2. Update help text and usage examples - documents the new flag for users
3. Validate the numeric input - ensures robustness against invalid inputs

## Current State Analysis

The codebase currently:
- Has `NUM_IMPLEMENTATIONS=3` hardcoded at `parallel-impl.sh:12`
- Parses only one argument: `FEATURE_REQUEST="$1"` at line 22
- Has no argument parsing for flags
- Documentation in README.md mentions editing the script to change NUM_IMPLEMENTATIONS (lines 106-111)

Key constraints:
- Must maintain backwards compatibility (positional argument for feature request)
- Must validate numeric input (reasonable range: 1-10)
- Should use standard bash argument parsing patterns

## Desired End State

After implementation:
- Users can run: `./parallel-impl.sh -n 5 "Add feature X"`
- Default remains 3 if `-n` is not specified
- Invalid values (non-numeric, out of range) produce clear error messages
- README.md documents the new flag
- Help text (`-h/--help`) displays the new option

### Key Discoveries:
- Current argument parsing is minimal at `parallel-impl.sh:22-31`
- Color-coded error output pattern exists at `parallel-impl.sh:15-19`
- Script already has error handling patterns we can follow
- README has a "Configuration" section at lines 103-131 that explains manual editing

## What We're NOT Doing

- Not adding a configuration file (out of scope)
- Not adding other CLI flags beyond `-n/--num` and `-h/--help`
- Not changing the worktree directory via CLI (separate feature)
- Not adding verbose/debug mode
- Not modifying the review or implementation prompts

## Implementation Approach

Use a `while` loop with `case` statement for argument parsing (standard bash pattern). Parse all flags first, then require the feature request as the final positional argument. Keep the implementation minimal and follow existing code patterns.

## Files to Edit

1. `parallel-impl.sh` - Lines 21-32 (argument parsing section)
2. `README.md` - Lines 41-47 (usage section) and Lines 103-111 (configuration section)

## Task 1: Add CLI argument parsing for `-n/--num` flag
**File**: `parallel-impl.sh`
**Description of Changes**:
- Replace the simple `FEATURE_REQUEST="$1"` with a `while` loop using `case` statement
- Add `-n|--num` case to accept a numeric argument
- Add `-h|--help` case to display usage information
- After parsing flags, shift arguments and capture remaining as FEATURE_REQUEST
- Validate NUM_IMPLEMENTATIONS is between 1 and 10

### Success Criteria:

#### Automated Verification:
- [ ] Script runs without syntax errors: `bash -n parallel-impl.sh`
- [ ] Help flag works: `./parallel-impl.sh -h` shows usage
- [ ] Default works: `./parallel-impl.sh "test"` uses NUM_IMPLEMENTATIONS=3
- [ ] Custom count works: `./parallel-impl.sh -n 2 "test"` sets NUM_IMPLEMENTATIONS=2
- [ ] Invalid input rejected: `./parallel-impl.sh -n abc "test"` shows error
- [ ] Out of range rejected: `./parallel-impl.sh -n 0 "test"` shows error
- [ ] Out of range rejected: `./parallel-impl.sh -n 15 "test"` shows error

#### Manual Verification:
- [ ] Error messages are clear and helpful
- [ ] Help text is comprehensive

---

## Task 2: Update documentation
**File**: `README.md`
**Description of Changes**:
- Add `-n/--num` flag to usage examples in Basic Usage section
- Update Configuration section to mention the CLI flag as the preferred method
- Add example showing the flag in use

### Success Criteria:

#### Automated Verification:
- [ ] README.md contains `-n` flag documentation
- [ ] Examples show both default and custom usage

#### Manual Verification:
- [ ] Documentation is clear and follows existing style
- [ ] Examples are practical and helpful

---

## Migration Notes

No migration required. The change is backwards compatible:
- Existing usage `./parallel-impl.sh "feature"` continues to work
- New usage `./parallel-impl.sh -n 5 "feature"` is additive

## References

- Existing argument handling: `parallel-impl.sh:22-31`
- Error output pattern: `parallel-impl.sh:25-31`
- README configuration section: `README.md:103-131`
