import os

def fix_modal_position(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the modal block
    start_str = "      {/* Edit Doctor Modal */}"
    end_str = "      </Modal>\n\nconst styles = StyleSheet.create({"
    
    if start_str in content and end_str in content:
        start_idx = content.index(start_str)
        end_idx = content.index(end_str) + len("      </Modal>\n\n")
        
        modal_content = content[start_idx:end_idx]
        
        # Remove it from the current position
        content = content[:start_idx] + content[end_idx:]
        
        # Insert it before the last </View> );
        insert_target = "      </View>\n    );\n  }"
        
        if insert_target in content:
            content = content.replace(insert_target, modal_content + insert_target)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print("Fixed modal position in", filepath)
        else:
            # Maybe it's formatted slightly differently
            insert_target_2 = "</View>\n    );\n  }"
            if insert_target_2 in content:
                content = content.replace(insert_target_2, modal_content + insert_target_2)
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(content)
                print("Fixed modal position in", filepath)
            else:
                print("Could not find insert target in", filepath)
    else:
        print("Modal start/end not found in", filepath)

dept_path = r"c:\Users\Lohitha Asish\Desktop\BMH\bmh_frontend_new\app\department\dashboard\doctors\index.tsx"
fix_modal_position(dept_path)
