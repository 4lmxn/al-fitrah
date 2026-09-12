import { cn } from "@/lib/cn";

// Every icon the site renders, in one list, because the Material Symbols
// stylesheet is subsetted to exactly these names (see layout.tsx). The full
// font is 316 KB and blocks first paint; this subset is 12 KB.
//
// Add an icon to a page, add it here. `tests/unit/icons.test.ts` rescans the
// source and fails if the two ever drift — a missing name renders as the
// literal word "expand_more" in the page, which is not a failure anyone
// notices in review.
export const ICON_NAMES = [
  "account_circle", "account_tree", "add", "admin_panel_settings", "analytics",
  "arrow_back", "arrow_downward", "arrow_forward", "arrow_upward", "article",
  "assignment", "auto_awesome", "auto_stories", "badge", "beach_access", "bolt",
  "calculate", "calendar_month", "call", "campaign", "celebration", "chat",
  "check", "check_circle", "child_care", "close", "cloud", "contact_support",
  "content_copy", "conversion_path", "description", "directions", "diversity_3",
  "download", "edit", "edit_note", "emergency", "error", "event",
  "event_available", "event_busy", "expand_more", "explore", "explore_off",
  "fact_check", "family_restroom", "favorite", "filter_alt", "first_page",
  "format_quote", "gavel", "group", "groups", "handshake", "history",
  "how_to_reg", "inbox", "info", "insights", "label", "language", "link",
  "list", "list_alt", "location_off", "location_on", "login", "logout", "mail",
  "map", "mark_email_unread", "medical_information", "menu_book", "mosque",
  "my_location",
  "nature_people", "notification_important", "notifications", "open_in_new",
  "payments", "person", "person_add", "picture_as_pdf", "psychology", "public",
  "radio_button_checked", "radio_button_unchecked", "receipt_long", "schedule",
  "school", "search", "search_off", "self_improvement", "settings", "snooze",
  "south", "staff_application", "styler", "task_alt", "tour", "translate",
  "trending_flat", "trending_up", "tune", "upload", "upload_file", "verified",
  "volunteer_activism", "wb_sunny", "work", "work_off",
] as const;

export function Icon({ name, className }: { name: string; className?: string }) {
  return <span aria-hidden className={cn("material-symbols-outlined", className)}>{name}</span>;
}
