# JumpSuit's protocol specification

The protocol's endianness is big-endian.
Messages are serialized with a custom protocol before being sent. This document references JumpSuit's protocol.
Strings are always encoded as UTF-8. When the protocol mandates the length of a string, it is implied the length is an amount of bytes.
Angles are always encoded as brads.
When a value takes only one byte, 1 means enabled and 0 means disabled.


## Notation

Possible values for a field are noted:
 * with a number for the packet type (ex: `4`)
 * with lowercase words for variables (ex: `player name`)
 * with lowercase words between double quotes for strings variables (`"player name"`)
 * with lowercase words starting with a uppercase character for enumerations (ex: `Error Type`)
 * with uppercase snake case for packets and subpayloads (ex: `CREATE_PRIVATE_LOBBY`)
Values dubbed `unused bits` are not used, but are present to complete a byte.

Values are enclosed in boxes.
The minus signs (-) indicates the value is required and not repeated.
The tilde (~) indicates the value is optional and not repeated.
The equal sign (=) indicates the value is optional and repeated.

```
+-------+
| value |
+-------+

+~~~~~~~~~~~~~~~~+
| optional value |
+~~~~~~~~~~~~~~~~+

+================+
| repeated value |
+================+
```


## Subpayloads

Subpayloads are sequences of bytes which are always defined after the same scheme. They often represent an entity with multiples properties.
They might be used several times in a packet or in packets with different types.


#### PLANET
```
       2B            2B           2B
+--------------+--------------+--------+------+
| x-coordinate | y-coordinate | radius | Type |
+--------------+--------------+--------+------+
```

`Type` must be either:
 0. concrete
 1. grass


#### LESSER_PLANET
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


#### PLAYER
```
      2B             2B               1B            1B       1B           1b         1b          3b        3b        4b             2b              2b             1B        0-255B
+--------------+--------------+-----------------+-------+-----------+------------+---------+------------+------+-------------+--------------+----------------+-------------+--------+
| x-coordinate | y-coordinate | attached planet | angle | aim angle | looks left | jetpack | Walk Frame | Team | unused bits | Armed Weapon | Carried Weapon | name length | "name" |
+--------------+--------------+-----------------+-------+-----------+------------+---------+------------+------+-------------+--------------+----------------+-------------+--------+
```

If `attached planet`'s value is 255, the player is not attached to a planet.
`Walk Frame` must be either:
 0. `duck`
 1. `hurt`
 2. `jump`
 3. `stand`
 4. `walk1`
 5. `walk2`
`Team` must be either:
 0. `blue team`
 1. `beige team`
 2. `green team`
 3. `pink team`
 4. `yellow team`
`Armed Weapon` and `Carried Weapon` must be either:
 0. `lmg`
 1. `smg`
 2. `shotgun`
 3. `sniper`


#### LESSER_PLAYER
```
      2B             2B               1B           1B        1B           1b         1b       1b       3b           6b             2b              2b
+--------------+--------------+-----------------+-------+-----------+------------+---------+------+------------+-------------+--------------+----------------+
| x-coordinate | y-coordinate | attached planet | angle | aim angle | looks left | jetpack | hurt | Walk Frame | unused bits | Armed Weapon | Carried Weapon |
+--------------+--------------+-----------------+-------+-----------+------------+---------+------+------------+-------------+--------------+----------------+
```

`Walk Frame` must be either:
 0. `duck`
 1. `jump`
 2. `stand`
 3. `walk1`
 4. `walk2`
`Armed Weapon` and `Carried Weapon` must be either:
 0. `lmg`
 1. `smg`
 2. `shotgun`
 3. `sniper`


#### SHOT
```
      4B         1B         7b            1b
+-------------+-------+-------------+-------------+
| LESSER_SHOT | angle | unused bits | from weapon |
+-------------+-------+-------------+-------------+
```


#### LESSER_SHOT
```
      2B              2B
+--------------+--------------+
| x-coordinate | y-coordinate |
+--------------+--------------+
```


#### SERVER
```
  16B         ?B
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


## Packets

The first byte of every packet determines its type. A payload may be placed after this first byte. The payload may contain subpayloads or payloads.

```
   1B       ?B
+------+-----------
| Type | payload...
+------+-----------
```

There are 19 packet types.



### Master server ↔ Game server

Game servers will attempt to connect to the master server's websocket at "/game_servers".

#### REGISTER_SERVER (game server → master server)
```
 1B          ?B
+---+----------------+
| 0 | PARTIAL_SERVER |
+---+----------------+
```


### Client ↔ Master server

Clients will attempt to connect to the master server's websocket at "/clients".

#### ADD_SERVERS (master server → client)
```
 1B    ?*6B
+---+========+
| 1 | SERVER |
+---+========+
```


#### REMOVE_SERVERS (master server → client)
```
 1B      2B
+---+===========+
| 2 | server id |
+---+===========+
```


### Client ↔ Game server

#### SET_NAME (client → game server)
```
 1B       0B-?B
+---+---------------+
| 3 | "player name" |
+---+---------------+
```

The player must send this message before `CONNECT` or `CREATE_PRIVATE_LOBBY`.


#### SET_NAME_BROADCAST (game server → client)
```
 1B      1B           0B-?B
+---+-----------+---------------+
| 4 | player id | "player name" |
+---+-----------+---------------+
```


#### CREATE_PRIVATE_LOBBY (client → game server)
```
 1B              1B
+---+---------------------------+
| 5 | maximum amount of players |
+---+---------------------------+
```

The game server will respond with CONNECT_ACCEPTED.


#### CONNECT (client → game server)
```
 1B      4B
+---+~~~~~~~~~~+
| 6 | lobby id |
+---+~~~~~~~~~~+
```

The game server will respond with CONNECT_ACCEPTED.
The `lobby id` must be set only if the player wishes to connect to a specific lobby (this is the only way to access private lobbies). In this case the server might respond with an ERROR rather than with CONNECT_ACCEPTED.


#### ERROR (game server → client)
```
 1B       1B
+---+------------+
| 7 | Error Type |
+---+------------+
```

`Error Type` must be either:
 0. no lobby avalaible
The game server will respond with CONNECT_ACCEPTED.
 1. no slot avalaible


#### CONNECT_ACCEPTED (game server → client)
```
 1B      4B          1B           1B             2B                2B              3b           1b          1b           1b          1b           1b            ?B
+---+----------+-----------+--------------+----------------+-----------------+--------------------------+-----------+------------+-----------+-------------+------------+
| 8 | lobby id | player id | homograph id | universe width | universe height | unused bits | beige team | blue team | green team | pink team | yellow team | ADD_ENTITY |
+---+----------+-----------+--------------+----------------+-----------------+-------------+------------+-----------+------------+-----------+-------------+------------+
```

The homograph id is used to distinguish players with the same name. It is unique for every player with the same name.


#### LOBBY_STATE (game server → client)
```
 1B       1B         1B
+---+-------------+~~~~~~~+
| 9 | Lobby State | timer |
+---+-------------+~~~~~~~+
```

`Lobby State` must be either:
 0. warmup
 1. game started
 2. game over


#### ADD_ENTITY (game server → client)
```
  1B       1B           ?*6B         1B        ?*5B         1B       ?*6B     ?B
+----+---------------+========+--------------+=======+-------------+======+========+
| 10 | planet amount | PLANET | enemy amount | ENEMY | shot amount | SHOT | PLAYER |
+----+---------------+========+--------------+=======+-------------+======+========+
```


#### REMOVE_ENTITY (game server → client)
```
  1B        1B           ?*1B           1B          ?*1B         1B         ?*1B       ?*1B
+----+---------------+===========+--------------+==========+-------------+=========+===========+
| 11 | planet amount | planet id | enemy amount | enemy id | shot amount | shot id | player id |
+----+---------------+===========+--------------+==========+-------------+=========+===========+
```


#### GAME_STATE (game server → client)
```
  1B       1B           2B           ?*3B           ?*1B          ?*4B           ?*9B
+----+-------------+-----------+===============+=============+=============+===============+
| 12 | your health | your fuel | LESSER_PLANET | enemy angle | LESSER_SHOT | LESSER_PLAYER |
+----+-------------+-----------+===============+=============+=============+===============+
```


#### PLAYER_CONTROLS (client → game server)
```
  1B    1b    1b      1b       1b         1b           1b            1b          1b
+----+------+-----+--------+---------+-----------+------------+---------------+-------+
| 13 | jump | run | crouch | jetpack | move left | move right | change weapon | shoot |
+----+------+-----+--------+---------+-----------+------------+---------------+-------+
```


#### AIM_ANGLE (client → game server)
```
  1B    1B
+----+-------+
| 14 | angle |
+----+-------+
```


#### CHAT (client → game server)
```
  1B      1B
+----+-----------+
| 15 | "message" |
+----+-----------+
```


#### CHAT_BROADCAST (game server → client)
```
  1B      1B          ?B
+----+-----------+-----------+
| 16 | player id | "message" |
+----+-----------+-----------+
```

#### SCORES (game server → client)
```
  1B       4B
+----+============+
| 17 | team score |
+----+============+
```

There are as many `team score`s as there are teams. Which teams are playing has already been sent with a CONNECT_ACCEPTED message.
The order `team score`s can be mapped to teams is as follow (provided the teams are enabled): beige team, blue team, green team, pink team, yellow team.
