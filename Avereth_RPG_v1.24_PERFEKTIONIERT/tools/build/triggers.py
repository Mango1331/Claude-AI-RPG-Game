# -*- coding: utf-8 -*-
r"""Trigger design of the compiled WorldInfo v1.23.

SillyTavern facts this relies on (verified in public/scripts/world-info.js):
* the scan buffer is '\x01' + [latest message, older messages...].join('\n\x01') (+ injections);
* a key written as /pattern/flags is a JavaScript RegExp tested against that RAW buffer;
* therefore  ^\x01[^\x01]*   restricts a regex to the LATEST message even when scanDepth is 2;
* an unescaped '/' inside the pattern invalidates the key -> slashes are written as \/ .
All patterns below are plain Python strings holding the exact JSON key text (single backslashes).
"""

# ---------------------------------------------------------------- phase markers (semantic state)
_LABEL = r"\b(?:Combat|Encounter)(?:[ \t]+(?:State|Status|Phase))?"
_DECOR = r"[\s:*_\-–—|=>\[\]()#~→]{0,8}"              # decoration only — no letters can be skipped
_ARROW = r"[\s*_]*(?:->|→|=>|–>|—>)[\s*_]*"
_NOT_FOLLOWED_BY_ARROW = r"(?![\s*_]*(?:->|→|=>|–>|—>))"

ACTIVE_RE = ("/" + _LABEL + _DECOR + r"(?:(?:PENDING|INACTIVE|START(?:ING)?)" + _ARROW + r")?ACTIVE\b"
             + _NOT_FOLLOWED_BY_ARROW + "/i")
PENDING_RE = ("/" + _LABEL + _DECOR + r"(?:INACTIVE" + _ARROW + r")?PENDING\b" + _NOT_FOLLOWED_BY_ARROW
              + r"(?!\s*(?:Combat\s+)?XP)/i")
START_PENDING_RE = r"/\bCombat\s+Start[\s:*_\-–—|]{0,6}PENDING\b/i"
ENDED_RE = ("/" + _LABEL + _DECOR + r"(?:(?:ACTIVE|PENDING)" + _ARROW
            + r")?(?:INACTIVE|ENDED|ENDING|COMPLETE|COMPLETED|RESOLVED|OVER|TERMINAL)\b" + _NOT_FOLLOWED_BY_ARROW + "/i")
COMBAT_END_RE = r"/\bCombat\s+End(?:ed)?[\s:*_\-–—|]{0,6}(?:COMPLETE|RESOLVED|DONE)\b/i"

# ---------------------------------------------------------------- latest-message helpers
_LATEST = r"^\x01[^\x01]*?"
CMD_RE = r"/^\x01\s*#/"                                  # System command: first non-space char is '#'

# ---------------------------------------------------------------- START (hostile commitment in the latest message)
_ATTACK_VERBS = (
    # idioms are excluded locally with lookaheads, so a real attack elsewhere in the same message still counts
    r"attack(?:s|ed|ing)?|"
    r"shoot(?:s|ing)?(?!\s+(?:(?:him|her|them|me|us|it)\s+)?(?:a|an)\s+(?:look|glance|glare|smile|grin|wink|question)\b)|"
    r"stab(?:s|bed|bing)?|slash(?:es|ed|ing)?|"
    r"(?:strike|strikes|struck|striking)(?!\s+(?:up|out|a\s+(?:deal|bargain|match|pose|chord|balance|light))\b)|"
    r"hit(?:s|ting)?(?!\s+(?:it\s+off|the\s+(?:road|trail|hay|sack|books|bottle|town|streets|tavern|inn|market))\b)|"
    r"punch(?:es|ed|ing)?(?!\s+in\b)|kick(?:s|ed|ing)?(?!\s+(?:off|back|in)\b)|smash(?:es|ed|ing)?|"
    r"kill(?:s|ed|ing)?(?!\s+time\b)|bash(?:es|ed|ing)?|pierce(?:s|d)?|"
    r"swing(?:s|ing)?(?!\s+by\b)|swung(?!\s+by\b)"
)
_DIRECTED = (r"(?:fire|fires|fired|firing|loose|looses|loosed|loosing|throw|throws|threw|thrown|throwing|cast|casts|"
             r"casting|release|releases|released|releasing|hurl|hurls|hurled)\b"
             r"(?!\s+(?:(?:a|an|my|his|her|the|one|another|quick|last|long|wary|sidelong)\s+){0,2}(?:glance|glances|look|"
             r"looks|line|lines|net|nets|eye|eyes|shadow|shadows|vote|votes|doubt|light|dice|lots|anchor)\b)"
             r"(?:\s+\w+){0,4}?\s+(?:at|on|into|against|toward|towards)\b")
_FIRE_PROJECTILE = (r"(?:fire|fires|fired|firing|loose|looses|loosed|loosing|release|releases|released|draw and release)"
                    r"\s+(?:an?\s+|my\s+|the\s+|another\s+)?(?:arrow|arrows|shot|bolt|volley)\b")
START_ATTACK_RE = "/" + _LATEST + r"\b(?:" + _ATTACK_VERBS + r"|" + _DIRECTED + r"|" + _FIRE_PROJECTILE + r")\b/i"

# Hostile phrasings that are not single attack verbs. Verbs that are also ordinary nouns (charge, fire) only count
# when Alaric is the subject ("I charge the boar", "*lunges at the wolf*"), never in "I pay the charge at the gate".
_ADVERB = r"(?:(?:then|now|quickly|suddenly|immediately|just|also|swiftly|instantly)\s+)?"
_SUBJECT_LED = (r"(?:\b(?:I|we)\s+|\*\s*)" + _ADVERB + r"(?:"
                r"(?:lunge|lunges|lunged|lunging|tackle|tackles|tackled|tackling|ram|rams|rammed|ramming)\b|"
                r"(?:charge|charges|charged|charging)\b(?!\s+(?:for|up|(?:(?:a|an|the|my|his|her|their|\d+)\s+)?(?:fee|fees|"
                r"toll|price|coin|coins|silver|gold|copper|tax|sum|crystal|crystals|rune|runes|stone|gem|gems)\b))|"
                r"(?:fire|fires|fired|loose|looses|loosed)\b(?!\s+(?:up|off|out)\b))")
_PUT_ARROW = (r"(?:put|puts|putting|send|sends|sent|sending)\s+(?:an?|another|one|two|a\s+second)\s+(?:\w+\s+)?"
              r"(?:arrow|arrows|bolt|bolts|shaft|shafts)\s+(?:in|into|through)\b")
_WEAPON_INTO = (r"(?:drive|drives|drove|driving|sink|sinks|sank|sinking|bury|buries|buried|burying|plunge|plunges|plunged|"
                r"plunging|thrust|thrusts|thrusting|jab|jabs|jabbed|jabbing|ram|rams|rammed|ramming)\s+"
                r"(?:(?:an?|my|the|his|her|another)\s+)?(?:\w+\s+)?(?:arrow|arrows|bolt|blade|sword|longsword|dagger|knife|"
                r"spear|rapier|mace|staff|axe|shield|fist|elbow|knee|heel)\s+(?:in|into|through|at|against)\b")
_LET_FLY = r"let(?:s|ting)?\s+(?:(?:an?|my|the|another)\s+)?(?:(?:arrow|arrows|bolt|bolts|shaft|shafts)\s+)?fly\b"
_OPEN_FIRE = r"open(?:s|ed|ing)?\s+fire\b"
_TAKE_SHOT = r"take(?:s|ing)?\s+(?:the|my)\s+shot\b"
_AIM_RELEASE = (r"(?:aim|aims|aimed|aiming|draw|draws|drew|drawing|nock|nocks|nocked|nocking)\s+and\s+(?:release|releases|"
                r"released|loose|looses|loosed|fire|fires|fired|let\s+fly)\b")
_THROAT = (r"(?:cut|cuts|cutting|slit|slits|slitting|slice|slices|sliced|slicing|open|opens|opened)\s+(?:its|his|her|their|"
           r"the\s+\w+(?:'s|’s)?)\s+throat\b|go(?:es)?\s+for\s+(?:the\s+kill|(?:its|his|her|their|the\s+\w+(?:'s|’s)?)\s+"
           r"(?:throat|neck|eyes?|heart))\b")
START_ACTION_RE = ("/" + _LATEST + r"(?:" + _SUBJECT_LED + r"|\b(?:" + "|".join(
    [_PUT_ARROW, _WEAPON_INTO, _LET_FLY, _OPEN_FIRE, _TAKE_SHOT, _AIM_RELEASE, _THROAT]) + r"))/i")

OFFENSIVE_MULTIWORD = ["Basic Attack", "Heavy Slash", "Power Strike", "Quick Slash", "Arcane Bolt", "Flame Lance",
                       "Arcane Burst", "Shield Strike", "Heavy Bash", "Shield Charge", "Precision Thrust",
                       "Guarded Thrust", "Aimed Shot", "Power Shot", "Quick Shot", "Twin Shot"]
OFFENSIVE_SINGLE = ["Charge", "Lunge", "Flurry"]
START_SKILL_RE = "/" + _LATEST + r"\b(?:" + "|".join(OFFENSIVE_MULTIWORD) + r")\b/i"
START_SKILL_CAP_RE = "/" + _LATEST + r"\b(?:" + "|".join(OFFENSIVE_SINGLE) + r")\b/"          # case-sensitive
START_SKILL_USE_RE = ("/" + _LATEST + r"\b(?:use|uses|using|activate|activates|activating)\s+(?:my\s+)?(?:"
                      + "|".join(s.lower() for s in OFFENSIVE_SINGLE) + r")\b/i")

ALL_SKILLS = {
    "WARRIOR": ["Heavy Slash", "Guard", "Power Strike", "Quick Slash", "Charge", "Deflect"],
    "MAGE": ["Arcane Bolt", "Arcane Ward", "Flame Lance", "Arcane Burst", "Blink", "Focused Ward"],
    "GUARDIAN": ["Shield Strike", "Brace", "Heavy Bash", "Bulwark", "Shield Charge", "Endure"],
    "DUELIST": ["Precision Thrust", "Evasive Step", "Lunge", "Flurry", "Feint", "Guarded Thrust"],
    "RANGER": ["Aimed Shot", "Quickstep", "Power Shot", "Quick Shot", "Twin Shot", "Focus Aim"],
}
_ALL_SKILL_ALT = "|".join(sorted({s for v in ALL_SKILLS.values() for s in v} | {"Basic Attack"}, key=lambda s: (-len(s), s)))   # longest first; deterministic
_INFO_WORDS = r"what\s+(?:does|do|is|are|would)|how\s+(?:does|do|much|many|would)|explain|describe|tell me about|compare|difference between"
START_INFO_RE = ("/" + _LATEST + r"\b(?:" + _INFO_WORDS + r")\b[^\x01.!?]{0,60}?\b(?:skill|skills|" + _ALL_SKILL_ALT
                 + r")\b/i")
START_INFO_REV_RE = ("/" + _LATEST + r"\b(?:" + _ALL_SKILL_ALT + r")\b[^\x01.!?]{0,40}?\b(?:what does it|how does it|"
                     r"explain|describe|details|description)\b/i")
CREATION_STEP_RE = r"/CHARACTER CREATION[\s\W]{1,6}STEP\s*[12]\s*\/\s*2/i"
CREATION_COMPLETE_RE = r"/CHARACTER CREATION[\s\W]{0,6}COMPLETE/i"

# ---------------------------------------------------------------- class entries (#19-#23): info queries + own-class commands
def class_info_re(cls):
    multi = [s for s in ALL_SKILLS[cls] if " " in s]
    return ("/^\\x01(?=[^\\x01]*?(?:#skills?\\b|\\b(?:what(?:'s|\\s+is|\\s+are|\\s+does|\\s+do)|how\\s+(?:does|do|much|many|strong|good)|"
            "explain|describe|tell me|details?|info|compare|difference)\\b))"
            "[^\\x01]*?\\b(?:" + "|".join(multi) + ")\\b/i")


def class_single_re(cls):
    single = [s for s in ALL_SKILLS[cls] if " " not in s]
    return ("/" + _LATEST + r"(?:#skill\s+(?:" + "|".join(single) + r")\b|\b(?:" + "|".join(single)
            + r")\s+(?:skill|Skill)\b)/i")


def class_cmd_re(cls):
    names = [cls.capitalize()] + ALL_SKILLS[cls]
    return "/^\\x01\\s*#(?:skills?|class)\\b[\\s\\S]*?\\b(?:" + "|".join(names) + ")\\b/i"


# ---------------------------------------------------------------- detail entries
MULTI_SKILL_RE = "/" + _LATEST + r"\b(?:Twin Shot|Flurry|Arcane Burst)\b/i"
WARD_SKILL_RE = "/" + _LATEST + r"\b(?:Arcane Ward|Focused Ward)\b/i"
POWER_VS_POWER_RE = ("/" + _LATEST + r"\b(?:counter|counters|countered|parry|parries|parried|reflect|reflects|"
                     r"dispel|dispels|interrupt|interrupts|grapple|grapples|grappled)\b/i")
ELEMENT_USER_RE = ("/" + _LATEST + r"\b(?:fire magic|fire element|flame|flames|Flame Lance|burning|ignite|ignites|"
                   r"ice|frost|frozen|freeze|lightning|electric|electricity|conductive|elemental|element|wet|soaked|"
                   r"water magic|wind magic|earth magic|smoke)\b/i")
ELEMENT_TAG_RE = r"/\b(?:WET|BURNING|FROZEN|CONDUCTIVE|OBSCURED|BRITTLE|UNSTABLE)\b/"          # tracker tags, case-sensitive
_STATUS = ["Burning", "Bleeding", "Poisoned", "Slowed", "Stunned", "Silenced", "Frozen", "Off-Balance", "Crippled",
           "Weakened", "Empowered"]
# tracker/System status names are capitalised; narrative "a frozen puddle" / "the boar is bleeding" is not a status
STATUS_CAP_RE = r"/\b(?:" + "|".join(_STATUS) + r")\b/"
STATUS_USER_RE = ("/" + _LATEST + r"\b(?:" + "|".join(s.lower() for s in _STATUS) + r"|status effect|status effects|"
                  r"condition)\b/i")
SYSTEM_MONSTER_RE = (r"/^\x01\s*#system\b[^\x01]*?\b(?:monster|creature|beast|fauna|rat|wolf|boar|deer|elk|horse|"
                     r"bear|feline|cat|serpent|snake|raptor|bird|hawk|insect|arthropod|spider|goblin|ogre|spirit|"
                     r"aquatic)\w*\b/i")
COMMAND_ROUTER_RE = (r"/^\x01\s*#(?:status|stats|skills|skill|class|domain|equipment|bag|inventory|item|quests|quest|"
                     r"effects|effect|combat|system|help)\b/i")

ALL_REGEX_KEYS = {
    "ACTIVE_RE": ACTIVE_RE, "PENDING_RE": PENDING_RE, "START_PENDING_RE": START_PENDING_RE, "ENDED_RE": ENDED_RE,
    "COMBAT_END_RE": COMBAT_END_RE, "CMD_RE": CMD_RE, "START_ATTACK_RE": START_ATTACK_RE,
    "START_ACTION_RE": START_ACTION_RE, "START_SKILL_RE": START_SKILL_RE, "START_SKILL_CAP_RE": START_SKILL_CAP_RE,
    "START_SKILL_USE_RE": START_SKILL_USE_RE, "START_INFO_RE": START_INFO_RE, "START_INFO_REV_RE": START_INFO_REV_RE,
    "CREATION_STEP_RE": CREATION_STEP_RE, "CREATION_COMPLETE_RE": CREATION_COMPLETE_RE,
    "MULTI_SKILL_RE": MULTI_SKILL_RE, "WARD_SKILL_RE": WARD_SKILL_RE, "POWER_VS_POWER_RE": POWER_VS_POWER_RE,
    "STATUS_CAP_RE": STATUS_CAP_RE, "STATUS_USER_RE": STATUS_USER_RE, "ELEMENT_USER_RE": ELEMENT_USER_RE, "ELEMENT_TAG_RE": ELEMENT_TAG_RE, "SYSTEM_MONSTER_RE": SYSTEM_MONSTER_RE,
    "COMMAND_ROUTER_RE": COMMAND_ROUTER_RE,
}
for _c in ALL_SKILLS:
    ALL_REGEX_KEYS[f"CLASS_INFO_{_c}"] = class_info_re(_c)
    ALL_REGEX_KEYS[f"CLASS_SINGLE_{_c}"] = class_single_re(_c)
    ALL_REGEX_KEYS[f"CLASS_CMD_{_c}"] = class_cmd_re(_c)
