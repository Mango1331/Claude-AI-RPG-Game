"""Identify the few non-game/auxiliary requests classified as narrator by the wire logger."""
def physical_role(start):
    if start['role']!='narrator':
        return start['role']
    first=start['body']['messages'][0]['content']
    if first=='Write the three words: The gate opens.':
        return 'preflight'
    if first.startswith('Name new fantasy Passives'):
        return 'passive_name'
    return 'narrator'
