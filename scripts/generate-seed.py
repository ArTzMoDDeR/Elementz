import json
from pathlib import Path

# Simple FR to EN translations (basic mapping)
FR_TO_EN = {
    "eau": "water", "vie": "life", "temps": "time", "internet": "internet",
    "feu": "fire", "terre": "earth", "air": "air", "glace": "ice",
    "amour": "love", "énergie": "energy", "marais": "swamp",
    "sable": "sand", "verre": "glass", "fil électrique": "wire",
    "ordinateur": "computer", "toile": "web", "abeille": "bee",
    "animal sauvage": "wild animal", "fleur": "flower", "acier": "steel",
    "charbon": "coal", "métal": "metal", "montagne": "mountain",
    "oiseau": "bird", "aiguille": "needle", "fil": "thread",
    "foin": "hay", "os": "bone", "poulet": "chicken",
    # Add more translations as needed - this is just a starter set
}

def translate_to_english(french_name):
    """Simple translation - you can enhance this"""
    if french_name in FR_TO_EN:
        return FR_TO_EN[french_name]
    # Default: capitalize first letter
    return french_name.title().replace(" ", " ")

# Read JSON
json_path = Path('/vercel/share/v0-project/scripts/alchemy_FR.json')
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

# Generate element list with numbers
elements = list(data.keys())
element_to_number = {name: idx + 1 for idx, name in enumerate(elements)}

# Generate SQL
sql_lines = []
sql_lines.append("-- Insert elements")
for number, name_fr in enumerate(elements, 1):
    name_en = translate_to_english(name_fr)
    name_fr_escaped = name_fr.replace("'", "''")
    name_en_escaped = name_en.replace("'", "''")
    sql_lines.append(
        f"INSERT INTO elements (number, name_french, name_english, img) "
        f"VALUES ({number}, '{name_fr_escaped}', '{name_en_escaped}', NULL);"
    )

sql_lines.append("\n-- Insert recipes")
for result_name, recipes in data.items():
    result_num = element_to_number[result_name]
    for recipe in recipes:
        ing1_name, ing2_name = recipe
        ing1_num = element_to_number.get(ing1_name)
        ing2_num = element_to_number.get(ing2_name)
        
        if ing1_num and ing2_num:
            # Ensure ing1 <= ing2 for uniqueness
            if ing1_num > ing2_num:
                ing1_num, ing2_num = ing2_num, ing1_num
            
            sql_lines.append(
                f"INSERT INTO recipes (ingredient1_number, ingredient2_number, result_number) "
                f"VALUES ({ing1_num}, {ing2_num}, {result_num}) ON CONFLICT DO NOTHING;"
            )

# Write SQL file
output_path = Path('/vercel/share/v0-project/scripts/002-seed-data.sql')
with open(output_path, 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))

print(f"✅ Generated SQL with {len(elements)} elements")
print(f"📝 Output: {output_path}")
