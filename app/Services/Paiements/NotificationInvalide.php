<?php

namespace App\Services\Paiements;

use RuntimeException;

/** Signature fausse, charge illisible : rien n'est enregistré. */
class NotificationInvalide extends RuntimeException {}
