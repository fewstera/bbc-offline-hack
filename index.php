<?php
    $pullPath = isset($_GET['path']) ? $_GET['path'] : '/';

    $ch = curl_init();
    curl_setopt($ch,CURLOPT_URL, 'http://m.bbc.co.uk' . $pullPath);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt ($ch, CURLOPT_COOKIEFILE, 'cookie.txt');
    curl_setopt ($ch, CURLOPT_COOKIEJAR, 'cookie.txt');
    curl_setopt($ch, CURLOPT_TIMEOUT, 2);
    $returnMarkup = curl_exec($ch);
    curl_close($ch);

    $parsedMarkup = str_replace('href="/', 'href="/?path=/', $returnMarkup);
    $parsedMarkup = str_replace('href="http://www.bbc.co.uk', 'href="/?path=', $parsedMarkup);

    /* Hack our things into the page */
    $hideCookieBar = "<style>#bbccookies{display: none !important;}</style>";
    $inlineJs = "<script>".file_get_contents('./js/inline.js')."</script>";
    $inlineHack = $hideCookieBar.$inlineJs."</body>";
    $parsedMarkup = str_replace('</body>', $inlineHack, $parsedMarkup);

	echo $parsedMarkup;
?>
