<?php

namespace App\Policies;

/**
 * Qui fait quoi sur une question dans le back-office : le circuit de
 * relecture commun aux contenus. L'élève ne voit jamais une question par
 * une route : il la reçoit dans une séance ou une leçon (CatalogueEleve).
 */
class QuestionPolicy extends PolicyContenuRelisable {}
