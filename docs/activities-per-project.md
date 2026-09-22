# Activities Per Project

## The Kimai Project/Activity Restriction Model

Kimai allows administrators to restrict activities to specific projects. An activity can be in one of two states:

- **Global activity** — `project === null`. The activity is available for all projects.
- **Project-specific activity** — `project` is set to a specific project ID. The activity can only be used with that project.

When a timesheet is created with a project/activity combination that is not allowed, Kimai returns a **"Validation Failed"** error:

```
Validation Failed
```

There is no hint about which activities actually work for the given project.

## Discovering Valid Activities for a Project

Use the `--project` (short: `-P`) flag on the `activities` command to show only activities that can be used with a given project:

```bash
kimai-cli activities --project <id>
```

The filter is applied client-side (fetch all, then filter) because the Kimai API does not support `/api/activities?project=<id>`. Global activities (`project === null`) are always included since they are valid for every project.

## Worked Example

```bash
# Find out which activities work for project #5
kimai-cli activities --project 5

# Combine with other filters
kimai-cli activities --project 5 --visible --billable
```

Example output:

```
 ID  | Name                    | Project        | Billable
-----|-------------------------|----------------|---------
  1  | Coding                  | (global)       | yes
  2  | Meeting                 | (global)       | yes
  8  | PreS-Ausschreibung      | #5             | yes
  9  | Angebotsprüfung         | #5             | no

Total: 4 activities for project #5
```

Compare this with the full activity list to see which activities are restricted to other projects.

## What Happens When You Use an Invalid Activity

If you log time with an activity that is not allowed for the project, Kimai rejects the request:

```bash
kimai-cli -p 5 -a 14 -n "PreS-Ausschreibung" -t 09:00-12:00
# ❌ API Error [400] Validation Failed
```

The activity `#14` (`PreS-Ausschreibung`) from the example above only works for projects other than `#5`. Use `kimai-cli activities --project 5` before logging to confirm which activity IDs are valid.
