• src/data/waves/level-2.json -> The "wave damage-band" property should be updated from "careless: 25-35%, competent: 10-15%" to "careless: 30%, competent: 12.5%".

• src/systems/ManaSystem.ts -> No changes needed, as the "debuffer mana-regen floor" and "speed-drain cap" properties are already valid.

• src/systems/MasterySystem.ts -> The existing master_discount property is set to "cooldown", so no change is needed here either.

• src/scenes/SpellroadScene.ts -> A new spell should be added, with a unique id (e.g., 12346), element, shape, base_power, and base_targets. This pseudocode shows the initial setup:
    ```
    const spellDefinition = {
      id: 12346,
      element: "mana", // or another suitable element
      shape: "circle", // or another suitable shape
      weight: 'Standard',
      basePower: 60, // Adjust to your liking
      baseTargets: 3, 
      masterDiscount: "cooldown"
    };
    ```

• src/data/enemyRegistry.ts -> No changes needed, as the existing enemy types (e.g., spellbound_thug) are already valid.

• src/data/waves/level-2.json -> The "enemies" array should be updated to include both melee and ranged enemies to encourage varied player strategies.
    ``` 
    "enemies": [
      { type: "spellbound_thug", count: 3, spawn_delay_ms: 250, hp_modifier: 1.0, damage_modifier: 0.75 },
      // Add more enemy types as needed
    ]
    ```

• src/data/spells/spells.json -> The new spell should be added to the list of existing spells.
    ```
    [
      // ...
      {
        "id": 12345,
        "element": "ice",
        "shape": "line",
        "weight": "Standard",
        "base_power": 15,
        "base_targets": 3,
        "master_discount": "cooldown"
      },
      {
        "id": 12346, // New spell
        "element": "mana", 
        "shape": "circle", 
        "weight": 'Standard',
        "basePower": 60,
        "baseTargets": 3,
        "masterDiscount": "cooldown"
      }
    ]
    ```

Please let me know if you need further assistance!