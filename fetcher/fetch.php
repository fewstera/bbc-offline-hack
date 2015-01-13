<?php
	$pullPath = isset($_GET['path']) ? $_GET['path'] : '/';

	$ch = curl_init();
	curl_setopt($ch,CURLOPT_URL, 'http://www.bbc.co.uk' . $pullPath);
    curl_setopt($ch,CURLOPT_RETURNTRANSFER,true);
	curl_setopt($ch, CURLOPT_TIMEOUT, 2);
	$returnMarkup = curl_exec($ch);
	curl_close($ch);

	$parsedMarkup = str_replace('href="http://www.bbc.co.uk', 'href="/fetcher/fetch.php?path=', $returnMarkup);
	$parsedMarkup = str_replace('href="/', 'href="/fetcher/fetch.php?path=/', $parsedMarkup);
	$hideCookieBar = "<style>#bbccookies{display: none !important;}</style></body>";
	$parsedMarkup = str_replace('</body>', $hideCookieBar, $parsedMarkup);

	echo $parsedMarkup;


?>