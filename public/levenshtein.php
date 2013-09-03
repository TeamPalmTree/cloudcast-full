<?php
/**
 * Created by JetBrains PhpStorm.
 * User: Alexander
 * Date: 8/20/13
 * Time: 7:18 PM
 * To change this template use File | Settings | File Templates.
 */

/*
echo levenshtein('Clarity', 'Clarity (Vinectone Remix)', 0, 1, 1) . '<br />';
echo levenshtein('Clarity (Vinectone Remix)', 'Clarity', 0, 1, 1) . '<br />';
echo levenshtein('Clarity', 'Clarity (Tiesto Remix)', 0, 1, 1) . '<br />';
echo levenshtein('Clarity', 'Clarity', 0, 1, 1) . '<br />';
echo levenshtein('Clarity', 'Clear Your Head', 0, 1, 1) . '<br />';
echo levenshtein('The Mom', 'The Monks', 0, 1, 1) . '<br />';
echo levenshtein('Madonna', 'Madonna (Remix)', 0, 1, 1) . '<br />';
echo levenshtein('The Cave', 'Caves are Gera', 0, 1, 1) . '<br />';
echo levenshtein('Daft Punk', 'Foxes feat. Daft Punk', 0, 1, 1) . '<br />';

echo levenshtein('Daft Punk', 'Daft Punk feat. Pharrell Williams', 0, 1, 1) . '<br />';

$efewf = array('1', '2', '3', '4');
$efff = array_slice($efewf, -3, 3, true);

print_r($efff);

*/


print_r(preg_split("/([\s]*feat.[\s]*)|([\s]*feat[\s]*)|([\s]*&[\s]*)|([\s]*vs.[\s]*)/i", "Madonna feat. Foxes & Tony Coolz VS. Stark Jr."));