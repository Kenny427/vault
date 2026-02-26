import json
import uuid

def add_proposal(description):
    try:
        with open('proposals.json', 'r') as f:
            proposals = json.load(f)
        print(f"Loaded proposals: {proposals}, type: {type(proposals)}")
    except FileNotFoundError:
        proposals = {}
        print("File not found, creating new dictionary")
    except json.JSONDecodeError:
        proposals = {}
        print("JSONDecodeError, creating new dictionary")

    proposal_id = str(uuid.uuid4())
    proposals[proposal_id] = {"description": description, "status": "pending"}

    print(f"Adding proposal: {{\"description\": \"{description}\", \"status\": \"pending\"}}")
    with open('proposals.json', 'w') as f:
        json.dump(proposals, f, indent=4)
        print(f"Wrote proposals: {proposals}, type: {type(proposals)}")
    print(f"Added proposal with ID: {proposal_id}")

if __name__ == "__main__":
    add_proposal("Test proposal")