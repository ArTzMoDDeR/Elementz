import json

# Read the JSON file
with open('/vercel/share/v0-project/scripts/alchemy_FR.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Extract all element names (keys of the JSON)
elements = list(data.keys())

# Generate SQL
sql_lines = [
    "-- Clear existing data",
    "TRUNCATE TABLE recipes CASCADE;",
    "TRUNCATE TABLE elements CASCADE;",
    "",
    "-- Insert all elements with French names only",
    "INSERT INTO elements (number, name_french, name_english, img) VALUES"
]

# Generate INSERT values
values = []
for idx, element_name in enumerate(elements, start=1):
    # Escape single quotes in names
    escaped_name = element_name.replace("'", "''")
    values.append(f"  ({idx}, '{escaped_name}', NULL, NULL)")

sql_lines.append(",\n".join(values) + ";")

# Write to SQL file
output_path = '/vercel/share/v0-project/scripts/003-insert-all-elements.sql'
with open(output_path, 'w', encoding='utf-8') as f:
    f.write("\n".join(sql_lines))

print(f"✅ Generated SQL with {len(elements)} elements")
print(f"📝 File: {output_path}")
