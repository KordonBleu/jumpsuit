# JumpSuit's protocol specification

Messages are serialized with a custom protocol before being sent. This document references JumpSuit's protocol.

The protocol's endianness is big-endian.
Strings are always encoded as **UTF-8**. When the protocol mandates the length of a string, it is implied the length is an amount of bytes.
Angles are always encoded as **brads**.
When a value takes only one byte, 1 means enabled and 0 means disabled.


## Notation

Possible values for a field are noted:

 * with a number for the packet type (ex: `4`)
 * with lowercase words for variables (ex: `player name`)
 * with lowercase words between double quotes for strings variables (`"player name"`)
 * with lowercase words starting with a uppercase character for enumerations (ex: `Error Type`)
 * with uppercase snake case for packets and subpayloads (ex: `LOBBY_STATE`)

Values dubbed `unused bits` are not used, but are present to complete a byte.

Values are enclosed in boxes.
The minus signs (-) indicates the value is required and not repeated.
The tilde (~) indicates the value is optional and not repeated.
The equal sign (=) indicates the value is optional and repeated.

```
         1B
+---------------------+
| value taking 1 byte |
+---------------------+

               4b
+~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~+
| optional value taking 4 bits |
+~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~+

                   4B  <- this is the space taken by ONE value, not the total amount
+======================================+
| value repeated between 4 and 6 times |
+======================================+
                   4-6
```

When the value is a payload or a subpayload, the space it takes isn't mentioned, you should refer to the section of this document about it.


## Packets

The first byte of every packet determines its type. A payload may be placed after this first byte. The payload may contain subpayloads or payloads.

```
   1B       ?B
+------+-----------
| Type | payload...
+------+-----------
```


## Subpayloads

Subpayloads are sequences of bytes which are always defined after the same scheme. They often represent an entity with multiples properties.
They might be used several times in a packet or in packets with different types.


#### PLANET
```
+--------------+------------+
| PLANET_CONST | PLANET_MUT |
+--------------+------------+
```


#### PLANET_CONST
```
       2B            2B           2B      1B
+--------------+--------------+--------+------+
| x-coordinate | y-coordinate | radius | Type |
+--------------+--------------+--------+------+
```

`Type` must be either:
 0. concrete
 1. grass


#### PLANET_MUT
```
     1B         1B
+----------+----------+
| Owned By | progress |
+----------+----------+
```

Owned By must be either:
 0. `neutral`
 1. `blue team`
 2. `beige team`
 3. `green team`
 4. `pink team`
 5. `yellow team`


#### ENEMY
```
+-------------+-----------+
| ENEMY_CONST | ENEMY_MUT |
+-------------+-----------+
```


#### ENEMY_CONST
```
      2B              2B           1B
+--------------+--------------+------------+
| x-coordinate | y-coordinate | Appearance |
+--------------+--------------+------------+
```

`Appearance` must be either:
 0. `enemyBlack1`
 1. `enemyBlack2`
 2. `enemyBlack3`
 3. `enemyBlack4`
 4. `enemyBlack5`
 5. `enemyBlue1`
 6. `enemyBlue2`
 7. `enemyBlue3`
 8. `enemyBlue4`
 9. `enemyBlue5`
 10. `enemyGreen1`
 11. `enemyGreen2`
 12. `enemyGreen3`
 13. `enemyGreen4`
 14. `enemyGreen5`
 15. `enemyRed1`
 16. `enemyRed2`
 17. `enemyRed3`
 18. `enemyRed4`
 19. `enemyRed5`


#### ENEMY_MUT
```
   1B
+-------+
| angle |
+-------+
```


#### PLAYER
```
+--------------+------------+
| PLAYER_CONST | PLAYER_MUT |
+--------------+------------+
```


#### PLAYER_CONST
```
      1B          5b         3b         1B            1B        0-255B
+-----------+-------------+---------------------+-------------+--------+
| player id | unused bits | Team | homograph id | name length | "name" |
+-----------+-------------+------+--------------+-------------+--------+
```
The `homograph id` is used to distinguish players with the same name. It is unique for every player with the same name.

`Team` must be either:
 0. `blue team`
 1. `beige team`
 2. `green team`
 3. `pink team`
 4. `yellow team`


#### PLAYER_MUT
```
     1B            2B             2B               1B           1B        1B           1b         1b       1b       3b           6b            2b              2b
+-----------+--------------+--------------+-----------------+-------+-----------+------------+---------+------+------------+-------------+--------------+----------------+
| player id | x-coordinate | y-coordinate | attached planet | angle | aim angle | looks left | jetpack | hurt | Walk Frame | unused bits | Armed Weapon | Carried Weapon |
+-----------+--------------+--------------+-----------------+-------+-----------+------------+---------+------+------------+-------------+--------------+----------------+
```
If `attached planet`'s value is 255, the player is not attached to a planet. This also means there cannot be more than 255 planets.

**`looks left` IS NOW USELESS SINCE IT CAN BE DEDUCTED FROM `AIM_ANGLE`.**

`Walk Frame` must be either:
 0. `duck`
 1. `jump`
 2. `stand`
 3. `walk1`
 4. `walk2`

`Armed Weapon` and `Carried Weapon` must be either:
 0. `Lmg`
 1. `Smg`
 2. `Shotgun`
 3. `Sniper`


#### SHOT
```
       2B             2B         1B       1B         6b         2b
+--------------+--------------+-------+--------+-------------+------+
| x-coordinate | y-coordinate | angle | origin | unused bits | type |
+--------------+--------------+-------+----------------------+------+
```

`origin` is 255 when emmitted by an enemy. However, since it is possible to have a player whose `id` is 255, this could lead to conflicts. **THIS PROBLEM MUST BE FIXED**, for example by using the `unused bits`.


#### SERVER
```
  16B
+------+----------------+
| ipv6 | PARTIAL_SERVER |
+------+----------------+
```


#### PARTIAL_SERVER
```
    1B      2B            1B               0-255B            1B            0-255B
+--------+------+--------------------+---------------+-----------------+------------+
| secure | port | server name length | "server name" | mod name length | "mod name" |
+--------+------+--------------------+---------------+-----------------+------------+
```


#### BOOTSTRAP_UNIVERSE
```
     4B          1B           2B                2B
+----------+-----------+----------------+-----------------+------------+
| lobby id | player id | universe width | universe height | ADD_ENTITY |
+----------+-----------+----------------+-----------------+------------+
```


#### BOOTSTRAP_SCORES
```
      3b                   5b
+-------------+------------------------+--------+
| unused bits |      enabled teams     | SCORES |
+-------------+ -  -  -  -  -  -  -  - +--------+
              | e.g.:  0 1 0 1 0       |
              |          ^   ^         |
              |          |   |         |
              |          |   alienPink |
              |          alienBlue     |
              +------------------------+
```





## Payloads

### Master server ↔ Game server

Game servers will attempt to connect to the master server's websocket at "/game_servers".

#### REGISTER_SERVER (game server → master server)
```
+----------------+
| PARTIAL_SERVER |
+----------------+
```


### Client ↔ Master server

Clients will attempt to connect to the master server's websocket at "/clients".

#### ADD_SERVERS (master server → client)
```
+========+
| SERVER |
+========+
    1-∞
```


#### REMOVE_SERVERS (master server → client)
```
     2B
+===========+
| server id |
+===========+
     1-∞
```


### Client ↔ Game server

#### SET_PREFERENCES (client → game server)
```
        1B               1B               0B-∞B
+----------------+------------------+---------------+
| primary weapon | secondary weapon | "player name" |
+----------------+------------------+---------------+
```

The player must send this message before `CONNECT`.


#### SET_NAME_BROADCAST (game server → client)
```
     1B            1B            0B-∞B
+-----------+--------------+---------------+
| player id | homograph id | "player name" |
+-----------+--------------+---------------+
```
The `homograph id` is used to distinguish players with the same name. It is unique for every player with the same name.


#### CONNECT (client → game server)
```
       1B            4B           1B                 1B              0B-∞B
+---------------+----------+----------------+------------------+---------------+
| lobbyDefined? | lobby id | primary weapon | secondary weapon | "player name" |
+---------------+----------+----------------+------------------+---------------+
```

The game server will respond with CONNECT_ACCEPTED.
The `lobby id` must be set only if the player wishes to connect to a specific lobby (which happens when connecting via a URL).

#### ERROR (game server → client)
```
      1B
+------------+
| Error Type |
+------------+
```

`Error Type` must be either:
 0. no lobby available
The game server will respond with CONNECT_ACCEPTED.
 1. no slot available


#### CONNECT_ACCEPTED_WARMUP
```
       3b            5b
+-------------+---------------+--------------------+
| unused bits | enabled teams | BOOTSTRAP_UNIVERSE |
+-------------+---------------+--------------------+
```


#### CONNECT_ACCEPTED_PLAYING
```
+--------------------+------------------+
| BOOTSTRAP_SCORES | BOOTSTRAP_UNIVERSE |
+--------------------+------------------+
```

#### CONNECT_ACCEPTED_DISPLAYING
```
+------------------+
| BOOTSTRAP_SCORES |
+------------------+
```


#### ADD_ENTITY (game server → client)
```
       1B                       1B                     1B
+---------------+========+--------------+=======+-------------+======+========+
| planet amount | PLANET | enemy amount | ENEMY | shot amount | SHOT | PLAYER |
+---------------+========+--------------+=======+-------------+======+========+
                  0-255                   0-255                0-255   0-255
```


#### REMOVE_ENTITY (game server → client)
```
       1B                          1B                       1B
+---------------+===========+--------------+==========+-------------+=========+===========+
| planet amount | planet id | enemy amount | enemy id | shot amount | shot id | player id |
+---------------+===========+--------------+==========+-------------+=========+===========+
                    0-255                     0-255                    0-255      0-255
```


#### GAME_STATE (game server → client)
```
      1B           2B
+-------------+-----------+============+===========+============+
| your health | your fuel | PLANET_MUT | ENEMY_MUT | PLAYER_MUT |
+-------------+-----------+============+===========+============+
                                0-255       0-255      0-255
```


#### PLAYER_CONTROLS (client → game server)
```
   1b    1b      1b       1b         1b           1b            1b          1b
+------+-----+--------+---------+-----------+------------+---------------+-------+
| jump | run | crouch | jetpack | move left | move right | change weapon | shoot |
+------+-----+--------+---------+-----------+------------+---------------+-------+
```


#### AIM_ANGLE (client → game server)
```
   1B
+-------+
| angle |
+-------+
```


#### CHAT (client → game server)
```
    0B-∞B
+-----------+
| "message" |
+-----------+
```


#### CHAT_BROADCAST (game server → client)
```
     1B         0B-∞B
+-----------+-----------+
| player id | "message" |
+-----------+-----------+
```

#### SCORES (game server → client)
```
     4B
+============+
| team score |
+============+
     1-5
```
There are as many `team score`s as there are teams playing. Which teams are playing has already been sent with a LOBBY_STATE message.
The order `team score`s can be mapped to teams is as follow (provided the teams are enabled): beige team, blue team, green team, pink team, yellow team.
